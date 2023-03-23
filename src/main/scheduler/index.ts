import { ipcMain, IpcMainEvent, IpcRendererEvent } from 'electron'
import { Task, TaskSet, TaskItem, TaskStatus, DownloadType, TaskType } from '../../share/models'
import { TaskModel, TaskSetModel, ModelField } from '../persistence/model_type'
import { mainWindow } from '../main'
import taskQueue from '../queue'
import { getDownloader, Downloader, RangeDownloader, DownloaderEvent } from '../downloaders'
import { createTaskModel, createTaskSetModel, updateTaskModel, updateTaskModelStatus, updateTaskModelParent, deleteTaskModel, getAllTaskModels, 
    updateTaskSetModel, updateTaskSetModelStatus, updateTaskSetModelChildren, deleteTaskSetModel, getAllTaskSetModels, getAllSequenceModels } from '../persistence'
import { Log, handlePromise, handleAsyncCallback } from '../../share/utils'
import { CommunicateAPIName } from '../../share/communication'
import parserModule from '../../share/parsers'
import { getValidFilename } from '../../share/utils/string'

const maxDownloadLimit: number = 3

class Scheduler {
    taskProcesserMap: Map<number, [Downloader, NodeJS.Timer]> = new Map()
    taskSetProcesserMap: Map<number, NodeJS.Timer> = new Map()
    constructor () {
        // Read from the database for all existing tasks and taskSets, send them to the newly created task list in renderer process interface.
        Promise.all([getAllTaskModels(), getAllTaskSetModels(), getAllSequenceModels()]).then(([tasks, taskSets, sequences]) => {
            for (const sequence of sequences) {
                if (sequence.taskType === TaskType.Task) {
                    const task: TaskModel = tasks.shift() as TaskModel
                    taskQueue.addTask(sequence.taskNo, task)
                    this.addTaskItemToRenderer(task, TaskType.Task)
                } else { // TaskSet
                    const taskSet: TaskSetModel = taskSets.shift() as TaskSetModel
                    taskQueue.addTaskSet(sequence.taskNo, taskSet)
                    this.addTaskItemToRenderer(taskSet, TaskType.TaskSet)
                }
            }
        })

        // Check out every once in a while if some waiting tasks can be started.
        setInterval(handleAsyncCallback(async (): Promise<void> => {
            if (this.taskProcesserMap.size < maxDownloadLimit) {
                const taskNo: number | null = taskQueue.getWaitingTaskNo()
                if (!taskNo) {
                    return
                }
                const parentTaskSetNo: number | null = this.getParentTaskNo(taskNo)
                const downloader: Downloader = await this.downloadTask(taskNo)
                const task: TaskModel = taskQueue.getTask(taskNo) as TaskModel

                if (parentTaskSetNo) {
                    this.downloadTaskSet(parentTaskSetNo)
                }

                downloader.on(DownloaderEvent.Done, handleAsyncCallback(async (): Promise<void> => {
                    const taskCallback = parserModule.getParser(task.parserNo).taskCallback
                    const taskSetCallback = parserModule.getParser(task.parserNo).taskSetCallback
                    if (taskCallback) {
                        try {
                            await taskCallback(taskNo)
                            await this.finishDownloadTask(taskNo, TaskStatus.Done)
                        } catch (error: any) {
                            await this.finishDownloadTask(taskNo, TaskStatus.Failed)
                        }
                    } else {
                        await this.finishDownloadTask(taskNo, TaskStatus.Done)
                    }
                    if (parentTaskSetNo) {
                        const taskSet: TaskSetModel = taskQueue.getTaskSet(parentTaskSetNo) as TaskSetModel
                        for (const childTaskNo of taskSet.children) {
                            if (this.taskProcesserMap.has(childTaskNo)) return
                        }
                        if (taskSetCallback) {
                            taskSet.status = TaskStatus.Processing
                            await updateTaskSetModel(taskSet)
                            try {
                                await taskSetCallback(parentTaskSetNo)
                            } catch (error: any) {
                                Log.errorLog(error)
                            }
                        }
                        await this.finishDownloadTaskSet(parentTaskSetNo)
                    }
                }))

                downloader.on(DownloaderEvent.Fail, handleAsyncCallback(async (): Promise<void> => {
                    await this.finishDownloadTask(taskNo, TaskStatus.Failed)
                    if (parentTaskSetNo) {
                        const taskSet: TaskSetModel = taskQueue.getTaskSet(parentTaskSetNo) as TaskSetModel
                        for (const childTaskNo of taskSet.children) {
                            if (this.taskProcesserMap.has(childTaskNo)) return
                        }
                        await this.finishDownloadTaskSet(parentTaskSetNo)
                    }
                }))

                downloader.download().catch((error: Error) => {
                    Log.errorLog(error)
                })
            }
        }), 100)

        ipcMain.on(CommunicateAPIName.AddTask, handleAsyncCallback(async (_event: IpcMainEvent, taskInfo: Task): Promise<void> => {
            taskInfo.status = TaskStatus.Waiting
            taskInfo.progress = 0
            if (taskInfo.downloadType === DownloadType.Range) {
                taskInfo.downloadRanges = [[0, taskInfo.size as number - 1]]
            }
            taskInfo.name = getValidFilename(taskInfo.name)
            const [error, task]: [Error | undefined, TaskModel] = await handlePromise<TaskModel>(createTaskModel(taskInfo))
            if (error) {
                Log.errorLog(error)
            }
            taskQueue.addTask(task.taskNo, task)
            this.addTaskItemToRenderer(task, TaskType.Task)
        }))
        ipcMain.on(CommunicateAPIName.AddTaskSet, handleAsyncCallback(async (_event: IpcMainEvent, [taskSetInfo, taskInfos]: [TaskSet, Array<Task>]): Promise<void> => {
            taskSetInfo.status = TaskStatus.Waiting
            taskSetInfo.progress = 0
            taskSetInfo.children = []
            taskSetInfo.name = getValidFilename(taskSetInfo.name)
            const [taskSetError, taskSet]: [Error | undefined, TaskSetModel] = await handlePromise<TaskSetModel>(createTaskSetModel(taskSetInfo))
            if (taskSetError) {
                Log.errorLog(taskSetError)
            }
            taskQueue.addTaskSet(taskSet.taskNo, taskSet)
            this.addTaskItemToRenderer(taskSet, TaskType.TaskSet)
            for (const taskInfo of taskInfos) {
                taskInfo.status = TaskStatus.Waiting
                taskInfo.progress = 0
                if (taskInfo.downloadType === DownloadType.Range) {
                    taskInfo.downloadRanges = [[0, taskInfo.size as number - 1]]
                }
                taskInfo.name = getValidFilename(taskInfo.name)
                const [taskError, task]: [Error | undefined, TaskModel] = await handlePromise<TaskModel>(createTaskModel(taskInfo))
                if (taskError) {
                    Log.errorLog(taskError)
                }
                task.parent = taskSet.taskNo
                await updateTaskModelParent(task)
                taskSet.children.push(task.taskNo)
                taskQueue.addTask(task.taskNo, task)
                this.addTaskItemToRenderer(task, TaskType.Task)
            }
            await updateTaskSetModelChildren(taskSet)
        }))
        ipcMain.on(CommunicateAPIName.PauseTasks, handleAsyncCallback(async (_event: IpcMainEvent, selectedTaskNos: Array<[number, TaskType]>): Promise<void> => {
            selectedTaskNos = this.getDistinctTaskNos(selectedTaskNos)
            const pauseTask = async (task: TaskModel) => {
                if (task.downloadType === DownloadType.Range) { 
                    if (task.get(`${ModelField.status}`) === TaskStatus.Downloading || task.get(`${ModelField.status}`) === TaskStatus.Waiting) {
                        await this.pauseDownloadTask(task.taskNo)
                        const parentNo: number | null = this.getParentTaskNo(task.taskNo)
                        if (!parentNo) {
                            return
                        }
                        const parent = taskQueue.getTaskSet(parentNo) as TaskSetModel
                        this.calculateTaskSetStatus(parent)
                        if (parent.status !== TaskStatus.Downloading) {
                            await this.pauseDownloadTaskSet(parentNo)
                        }
                    }
                } else if (task.downloadType === DownloadType.Blob) {}
            }
            for (const [taskNo, taskType] of selectedTaskNos.reverse()) {
                if (taskType === TaskType.Task) {
                    await pauseTask(taskQueue.getTask(taskNo) as TaskModel)
                } else { // TaskSet
                    for (const childTaskNo of (taskQueue.getTaskSet(taskNo) as TaskSetModel).children.reverse()) {
                        const child: TaskModel | null = taskQueue.getTask(childTaskNo)
                        if (!child) {
                            continue
                        }
                        await pauseTask(child)
                    }
                    await this.pauseDownloadTaskSet(taskNo)
                }
            }
        }))
        ipcMain.on(CommunicateAPIName.ResumeTasks, handleAsyncCallback(async (_event: IpcMainEvent, selectedTaskNos: Array<[number, TaskType]>): Promise<void> => {
            selectedTaskNos = this.getDistinctTaskNos(selectedTaskNos)
            const resumeTask = async (task: TaskModel) => {
                if (task.downloadType === DownloadType.Range && 
                    (task.get(`${ModelField.status}`) === TaskStatus.Failed || task.get(`${ModelField.status}`) === TaskStatus.Paused)) {
                    // const downloader: Downloader | undefined = this.downloaderMap.get(taskNo)
                    // if (!downloader) {
                    //     continue
                    // }
                    // downloader.resume()
                    task.status = TaskStatus.Waiting
                    await updateTaskModelStatus(task)
                    this.updateTaskItemToRenderer(task, TaskType.Task)
                }
            }
            for (const [taskNo, taskType] of selectedTaskNos) {
                if (taskType === TaskType.Task) {
                    await resumeTask(taskQueue.getTask(taskNo) as TaskModel)
                } else { // TaskSet
                    for (const childTaskNo of (taskQueue.getTaskSet(taskNo) as TaskSetModel).children) {
                        const child: TaskModel | null = taskQueue.getTask(childTaskNo)
                        if (!child) {
                            continue
                        }
                        await resumeTask(child)
                    }
                }
            }
        }))
        ipcMain.on(CommunicateAPIName.DeleteTasks, handleAsyncCallback(async (_event: IpcMainEvent, selectedTaskNos: Array<[number, TaskType]>): Promise<void> => {
            selectedTaskNos = this.getDistinctTaskNos(selectedTaskNos)
            const deleteTask = async (task: TaskModel) => {
                if (task.downloadType === DownloadType.Direct) {
                    
                } else if (task.downloadType === DownloadType.Range) {
                    if (task.get(`${ModelField.status}`) === TaskStatus.Downloading || task.get(`${ModelField.status}`) === TaskStatus.Waiting) {
                        await this.pauseDownloadTask(task.taskNo)
                    }
                    const [deleteError, __]: [Error | undefined, void] = await handlePromise<void>(deleteTaskModel(task))
                    if (deleteError) {
                        throw deleteError
                    }
                    this.deleteTaskItemToRenderer(task, TaskType.Task)
                }
            }
            const deleteTaskSet = async (taskSet: TaskSetModel) => {
                await this.pauseDownloadTaskSet(taskSet.taskNo)
                const [deleteError, __]: [Error | undefined, void] = await handlePromise<void>(deleteTaskSetModel(taskSet))
                if (deleteError) {
                    throw deleteError
                }
                this.deleteTaskItemToRenderer(taskSet, TaskType.TaskSet)
            }
            for (const [taskNo, taskType] of selectedTaskNos.reverse()) {
                if (taskType === TaskType.Task) {
                    await deleteTask(taskQueue.getTask(taskNo) as TaskModel)
                } else { // TaskSet
                    for (const childTaskNo of (taskQueue.getTaskSet(taskNo) as TaskSetModel).children.reverse()) {
                        const child: TaskModel | null = taskQueue.getTask(childTaskNo)
                        if (!child) {
                            continue
                        }
                        await deleteTask(child)
                    }
                    await deleteTaskSet(taskQueue.getTaskSet(taskNo) as TaskSetModel)
                }
            }
        }))
    }

    // Start downloading a waiting task and alloc processer resource binding with it's taskNo.
    downloadTask = async (taskNo: number): Promise<Downloader> => {
        const task: TaskModel = taskQueue.getTask(taskNo) as TaskModel
        const downloader: Downloader = getDownloader(taskNo)
        const taskTimer: NodeJS.Timer = setInterval(handleAsyncCallback(async () => {
            await updateTaskModel(task)
            this.updateTaskItemToRenderer(task, TaskType.Task)
        }), 200)
        this.taskProcesserMap.set(taskNo, [downloader, taskTimer])
        task.status = TaskStatus.Downloading
        await updateTaskModelStatus(task)
        this.updateTaskItemToRenderer(task, TaskType.Task)
        return downloader
    }

    downloadTaskSet = (taskNo: number): void => {
        if (this.taskSetProcesserMap.has(taskNo)) {
            return
        }
        const taskSetTimer: NodeJS.Timer = setInterval(handleAsyncCallback(async () => {
            const taskSet: TaskSetModel = taskQueue.getTaskSet(taskNo as number) as TaskSetModel
            if (taskSet.status !== TaskStatus.Processing) {
                this.calculateTaskSetStatus(taskSet)
            }
            this.calculateTaskSetProgress(taskSet)
            await updateTaskSetModel(taskSet)
            this.updateTaskItemToRenderer(taskSet, TaskType.TaskSet)
        }), 200)
        this.taskSetProcesserMap.set(taskNo, taskSetTimer)
    }

    // Pause a downloading or waiting task and clean up the processer resource if it's downloading.
    pauseDownloadTask = async (taskNo: number): Promise<void> => {
        if (this.taskProcesserMap.has(taskNo)) {
            const [downloader, downloadTimer]: [Downloader, NodeJS.Timer] = this.taskProcesserMap.get(taskNo) as [Downloader, NodeJS.Timer]
            ;(downloader as RangeDownloader).destroy()
            clearInterval(downloadTimer)
            this.taskProcesserMap.delete(taskNo)
        }
        const task: TaskModel = taskQueue.getTask(taskNo) as TaskModel
        task.status = TaskStatus.Paused
        await updateTaskModel(task)
        this.updateTaskItemToRenderer(task, TaskType.Task)
    }

    // Pause a taskSet and clean up the processer resource if it has a related processer.
    pauseDownloadTaskSet = async (taskNo: number): Promise<void> => {
        if (this.taskSetProcesserMap.has(taskNo)) {
            const downloadTimer: NodeJS.Timer = this.taskSetProcesserMap.get(taskNo) as NodeJS.Timer
            clearInterval(downloadTimer)
            this.taskSetProcesserMap.delete(taskNo)
        }
        const taskSet: TaskSetModel = taskQueue.getTaskSet(taskNo) as TaskSetModel
        this.calculateTaskSetStatus(taskSet)
        this.calculateTaskSetProgress(taskSet)
        await updateTaskSetModel(taskSet)
        this.updateTaskItemToRenderer(taskSet, TaskType.TaskSet)
    }

    // Finish an activiting task, whether it's done or failed.
    finishDownloadTask = async (taskNo: number, status: TaskStatus): Promise<void> => {
        clearInterval((this.taskProcesserMap.get(taskNo) as [Downloader, NodeJS.Timer])[1])
        this.taskProcesserMap.delete(taskNo)
        const task: TaskModel = taskQueue.getTask(taskNo) as TaskModel
        task.status = status
        await updateTaskModel(task)
        this.updateTaskItemToRenderer(task, TaskType.Task)
    }

    // Finish an activiting taskSet.
    finishDownloadTaskSet = async (taskNo: number): Promise<void> => {
        clearInterval(this.taskSetProcesserMap.get(taskNo) as NodeJS.Timer)
        this.taskSetProcesserMap.delete(taskNo)
        const taskSet: TaskSetModel = taskQueue.getTaskSet(taskNo) as TaskSetModel
        this.calculateTaskSetStatus(taskSet)
        this.calculateTaskSetProgress(taskSet)
        await updateTaskSetModel(taskSet)
        this.updateTaskItemToRenderer(taskSet, TaskType.TaskSet)
    }

    // Calculate a taskSet status by suming up it's children's progress.
    calculateTaskSetProgress = (taskSet: TaskSetModel): void => {
        taskSet.progress = 0
        taskSet.children.forEach((childTaskNo: number, _index: number, _array: Array<number>) => {
            const child: TaskModel | null = taskQueue.getTask(childTaskNo)
            if (child) {
                taskSet.progress += child.progress
            }
        })
    }

    // Calculate a taskSet status by considering it's children's status all together.
    calculateTaskSetStatus = (taskSet: TaskSetModel): void => {
        const statusMap: Map<TaskStatus, boolean> = new Map()
        taskSet.children.forEach((childTaskNo: number, _index: number, _array: Array<number>) => {
            const child: TaskModel | null = taskQueue.getTask(childTaskNo)
            if (child) {
                statusMap.set(child.status, true)
            }
        })
        if (statusMap.get(TaskStatus.Downloading)) {
            taskSet.status = TaskStatus.Downloading
        } else if (statusMap.get(TaskStatus.Waiting)) {
            taskSet.status = TaskStatus.Waiting
        } else if (statusMap.get(TaskStatus.Paused)) {
            taskSet.status = TaskStatus.Paused
        } else if (statusMap.get(TaskStatus.Failed)) {
            taskSet.status = TaskStatus.Failed
        } else { // Done
            taskSet.status = TaskStatus.Done
        }
    }

    // Get the parent taskNo of a task, if there is a parent.
    getParentTaskNo = (taskNo: number): number | null => {
        if (!taskQueue.getTask(taskNo)) {
            return null
        }
        if (!(taskQueue.getTask(taskNo) as TaskModel).parent) {
            return null
        }
        return (taskQueue.getTask(taskNo) as TaskModel).parent as number
    }

    // Get tasks which don't have parent and task_sets taskNos.
    getDistinctTaskNos = (taskNos: Array<[number, TaskType]>): Array<[number, TaskType]> => {
        const res: Array<[number, TaskType]> = []
        for (const [taskNo, taskType] of taskNos) {
            const taskItem: TaskModel | TaskSetModel | null = taskQueue.getTaskItem(taskNo, taskType)
            if (!taskItem) {
                continue
            }
            if (taskType === TaskType.Task) {
                if ((taskItem as TaskModel).parent && res.includes([(taskItem as TaskModel).parent as number, TaskType.TaskSet])) {
                    continue
                }
            } else { // TaskSet
                for (const childTaskNo of (taskItem as TaskSetModel).children) {
                    if (res.includes([childTaskNo, TaskType.Task])) {
                        res.splice(res.indexOf([childTaskNo, TaskType.Task]), 1)
                    }
                }
            }
            res.push([taskNo, taskType])
        }
        return res
    }

    //
    // Send the newest taskItem info to the renderer process.
    //
    addTaskItemToRenderer = (taskItem: TaskModel | TaskSetModel, taskType: TaskType): void => {
        if (!taskItem) {
            return
        }
        const taskItemInfo: TaskItem = taskItem.get()
        taskItemInfo.taskType = taskType
        mainWindow.webContents.send(CommunicateAPIName.NewTaskItem, taskItemInfo)
    }

    updateTaskItemToRenderer = (taskItem: TaskModel | TaskSetModel, taskType: TaskType): void => {
        if (!taskItem) {
            return
        }
        const taskItemInfo: TaskItem = taskItem.get()
        taskItemInfo.taskType = taskType
        mainWindow.webContents.send(CommunicateAPIName.UpdateTaskItem, taskItemInfo)
    }

    deleteTaskItemToRenderer = (taskItem: TaskModel | TaskSetModel, taskType: TaskType): void => {
        if (!taskItem) {
            return
        }
        const taskItemInfo: TaskItem = taskItem.get()
        taskItemInfo.taskType = taskType
        mainWindow.webContents.send(CommunicateAPIName.DeleteTaskItem, taskItemInfo)
    }
}

export { Scheduler }