import { ipcMain, IpcMainEvent, IpcRendererEvent } from 'electron'
import { Task, TaskSet, TaskItem, TaskStatus, DownloadType, TaskType } from '../../share/models'
import { TaskModel, TaskSetModel, ModelField } from '../persistence/model_type'
import { mainWindow } from '../main'
import { taskQueue } from '../queue'
import { getDownloader, Downloader, RangeDownloader, DownloaderEvent } from '../downloaders'
import { createTaskModel, createTaskSetModel, updateTaskModel, updateTaskModelStatus, updateTaskModelParent, deleteTaskModel, getAllTaskModels, 
    updateTaskSetModel, updateTaskSetModelStatus, updateTaskSetModelChildren, deleteTaskSetModel, getAllTaskSetModels, getAllSequenceModels } from '../persistence'
import { Log, handlePromise } from '../../share/utils'
import { CommunicateAPIName } from '../../share/communication'

const maxDownloadLimit: number = 3

class Scheduler {
    taskProcesserMap: Map<number, [Downloader, NodeJS.Timer]> = new Map()
    taskSetProcesserMap: Map<number, NodeJS.Timer> = new Map()
    constructor () {
        // Send tasks in database to the newly created task list interface
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

        setInterval(() => {
            if (this.taskProcesserMap.size < maxDownloadLimit) {
                const taskNo: number | null = taskQueue.getWaitingTaskNo()
                if (!taskNo) {
                    return
                }

                const downloader: Downloader = this.downloadTask(taskNo)

                // const task: TaskModel = taskQueue.getTask(taskNo) as TaskModel
                if (this.getParentTaskNo(taskNo)) {
                    this.downloadTaskSet(this.getParentTaskNo(taskNo) as number)
                }

                downloader.on(DownloaderEvent.Done, () => {
                    this.finishDownloadTask(taskNo, TaskStatus.Done)
                    if (this.getParentTaskNo(taskNo)) {
                        this.finishDownloadTaskSet(this.getParentTaskNo(taskNo) as number)
                    }
                })

                downloader.on(DownloaderEvent.Fail, () => {
                    this.finishDownloadTask(taskNo, TaskStatus.Failed)
                    if (this.getParentTaskNo(taskNo)) {
                        this.finishDownloadTaskSet(this.getParentTaskNo(taskNo) as number)
                    }
                })

                downloader.download().catch((error: Error) => {
                    Log.errorLog(error)
                })
            }
        }, 50)

        ipcMain.on(CommunicateAPIName.AddTask, async (_event: IpcMainEvent, taskInfo: Task): Promise<void> => {
            taskInfo.status = TaskStatus.Waiting
            taskInfo.progress = 0
            if (taskInfo.downloadType === DownloadType.Range) {
                taskInfo.downloadRanges = [[0, taskInfo.size as number - 1]]
            }
            const [error, task]: [Error | undefined, TaskModel] = await handlePromise<TaskModel>(createTaskModel(taskInfo))
            if (error) {
                Log.errorLog(error)
            }
            taskQueue.addTask(task.taskNo, task)
            this.addTaskItemToRenderer(task, TaskType.Task)
        })
        ipcMain.on(CommunicateAPIName.AddTaskSet, async (_event: IpcMainEvent, [taskSetInfo, taskInfos]: [TaskSet, Array<Task>]): Promise<void> => {
            taskSetInfo.status = TaskStatus.Waiting
            taskSetInfo.progress = 0
            taskSetInfo.children = []
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
                const [taskError, task]: [Error | undefined, TaskModel] = await handlePromise<TaskModel>(createTaskModel(taskInfo))
                if (taskError) {
                    Log.errorLog(taskError)
                }
                task.parent = taskSet.taskNo
                updateTaskModelParent(task)
                taskSet.children.push(task.taskNo)
                taskQueue.addTask(task.taskNo, task)
                this.addTaskItemToRenderer(task, TaskType.Task)
            }
            updateTaskSetModelChildren(taskSet)
        })
        ipcMain.on(CommunicateAPIName.PauseTasks, (_event: IpcMainEvent, selectedTaskNos: Array<[number, TaskType]>): void => {
            for (const [taskNo, taskType] of selectedTaskNos) {
                const taskItem: TaskModel | TaskSetModel | null = taskQueue.getTaskItem(taskNo, taskType)
                if (!taskItem) {
                    continue
                }
                const pauseTask = (task: TaskModel) => {
                    if (task.downloadType === DownloadType.Range && task.get(`${ModelField.status}`) === TaskStatus.Downloading) {
                        const [downloader, _]: [Downloader, NodeJS.Timer] = this.taskProcesserMap.get(taskNo) as [Downloader, NodeJS.Timer]
                        if (!downloader) {
                            return
                        }
                        (downloader as RangeDownloader).finish()
                        this.finishDownloadTask(taskNo, TaskStatus.Paused)
                    }
                }
                if (taskType === TaskType.Task) {
                    const task: TaskModel = taskItem as TaskModel
                    pauseTask(task)
                } else { // TaskSet
                    for (const childTaskNo of (taskItem as TaskSetModel).children) {
                        const child: TaskModel | null = taskQueue.getTask(childTaskNo)
                        if (!child) {
                            continue
                        }
                        pauseTask(child)
                    }
                }
            }
        })
        ipcMain.on(CommunicateAPIName.ResumeTasks, async (_event: IpcMainEvent, selectedTaskNos: Array<[number, TaskType]>): Promise<void> => {
            for (const [taskNo, taskType] of selectedTaskNos) {
                const taskItem: TaskModel | TaskSetModel | null = taskQueue.getTaskItem(taskNo, taskType)
                if (!taskItem) {
                    continue
                }
                const resumeTask = (task: TaskModel) => {
                    if (task.downloadType === DownloadType.Range && 
                        (task.get(`${ModelField.status}`) === TaskStatus.Failed || task.get(`${ModelField.status}`) === TaskStatus.Paused)) {
                        // const downloader: Downloader | undefined = this.downloaderMap.get(taskNo)
                        // if (!downloader) {
                        //     continue
                        // }
                        // downloader.resume()
                        taskItem.status = TaskStatus.Waiting
                        updateTaskModelStatus(task)
                        this.updateTaskItemToRenderer(task, TaskType.Task)
                    }
                }
                if (taskType === TaskType.Task) {
                    const task: TaskModel = taskItem as TaskModel
                    resumeTask(task)
                } else { // TaskSet
                    for (const childTaskNo of (taskItem as TaskSetModel).children) {
                        const child: TaskModel | null = taskQueue.getTask(childTaskNo)
                        if (!child) {
                            continue
                        }
                        resumeTask(child)
                    }
                }
            }
        })
        ipcMain.on(CommunicateAPIName.DeleteTasks, async (_event: IpcMainEvent, selectedTaskNos: Array<[number, TaskType]>): Promise<void> => {
            for (const [taskNo, taskType] of selectedTaskNos) {
                const taskItem: TaskModel | TaskSetModel | null = taskQueue.getTaskItem(taskNo, taskType)
                if (!taskItem) {
                    continue
                }
                const deleteTaskModel = async (task: TaskModel) => {
                    if (task.downloadType === DownloadType.Range) {
                        const [downloader, _]: [Downloader, NodeJS.Timer] = this.taskProcesserMap.get(taskNo) as [Downloader, NodeJS.Timer]
                        if (!downloader) {
                            return
                        }
                        ;(downloader as RangeDownloader).finish()
                        this.finishDownloadTask(taskNo, TaskStatus.Paused)
                        const [deleteError, __]: [Error | undefined, void] = await handlePromise<void>(deleteTaskModel(task))
                        if (deleteError) {
                            throw deleteError
                        }
                        this.deleteTaskItemToRenderer(task, TaskType.Task)
                    }
                }
                if (taskType === TaskType.Task) {
                    const task: TaskModel = taskItem as TaskModel
                    await deleteTaskModel(task)
                } else { // TaskSet
                    for (const childTaskNo of (taskItem as TaskSetModel).children) {
                        const child: TaskModel | null = taskQueue.getTask(childTaskNo)
                        if (!child) {
                            continue
                        }
                        await deleteTaskModel(child)
                    }
                }
            }
        })
    }

    downloadTask = (taskNo: number): Downloader => {
        const task: TaskModel = taskQueue.getTask(taskNo) as TaskModel
        const downloader: Downloader = getDownloader(taskNo)
        const taskTimer: NodeJS.Timer = setInterval(() => {
            updateTaskModel(task)
            this.updateTaskItemToRenderer(task, TaskType.Task)
        }, 200)
        this.taskProcesserMap.set(taskNo, [downloader, taskTimer])
        task.status = TaskStatus.Downloading
        updateTaskModelStatus(task)
        this.updateTaskItemToRenderer(task, TaskType.Task)
        return downloader
    }

    downloadTaskSet = (taskNo: number): void => {
        if (this.taskSetProcesserMap.has(taskNo)) {
            return
        }
        const taskSetTimer: NodeJS.Timer = setInterval(() => {
            const taskSet: TaskSetModel = taskQueue.getTaskSet(taskNo as number) as TaskSetModel
            this.calculateTaskSetStatus(taskSet)
            this.calculateTaskSetProgress(taskSet)
            updateTaskSetModel(taskSet)
            this.updateTaskItemToRenderer(taskSet, TaskType.TaskSet)
        }, 200)
        this.taskSetProcesserMap.set(taskNo, taskSetTimer)
    }

    // status: TaskStatus.Failed / TaskStatus.Done
    finishDownloadTask = (taskNo: number, status: TaskStatus): void => {
        const task: TaskModel = taskQueue.getTask(taskNo) as TaskModel
        task.status = status
        clearInterval((this.taskProcesserMap.get(taskNo) as [Downloader, NodeJS.Timer])[1])
        this.taskProcesserMap.delete(taskNo)
        updateTaskModel(task)
        this.updateTaskItemToRenderer(task, TaskType.Task)
    }

    finishDownloadTaskSet = (taskNo: number): void => {
        const taskSet: TaskSetModel = taskQueue.getTaskSet(taskNo) as TaskSetModel
        for (const child of taskSet.children) {
            if (this.taskProcesserMap.has(child)) {
                return
            }
        }

        this.calculateTaskSetStatus(taskSet)
        this.calculateTaskSetProgress(taskSet)
        clearInterval(this.taskSetProcesserMap.get(taskNo) as NodeJS.Timer)
        this.taskSetProcesserMap.delete(taskNo)
        updateTaskSetModel(taskSet)
        this.updateTaskItemToRenderer(taskSet, TaskType.TaskSet)
    }

    calculateTaskSetProgress = (taskSet: TaskSetModel): void => {
        taskSet.progress = 0
        taskSet.children.forEach((childTaskNo: number, _index: number, _array: Array<number>) => {
            const child: TaskModel | null = taskQueue.getTask(childTaskNo)
            if (child) {
                taskSet.progress += child.progress
            }
        })
    }

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

    getParentTaskNo = (taskNo: number): number | null => {
        if (!taskQueue.getTask(taskNo)) {
            return null
        }
        if (!(taskQueue.getTask(taskNo) as TaskModel).parent) {
            return null
        }
        return (taskQueue.getTask(taskNo) as TaskModel).parent as number
    }

    addTaskItemToRenderer = (taskItem: TaskModel | TaskSetModel, taskType: TaskType): void => {
        const taskItemInfo: TaskItem = taskItem.get()
        taskItemInfo.taskType = taskType
        mainWindow.webContents.send(CommunicateAPIName.NewTaskItem, taskItemInfo)
    }

    updateTaskItemToRenderer = (taskItem: TaskModel | TaskSetModel, taskType: TaskType): void => {
        const taskItemInfo: TaskItem = taskItem.get()
        taskItemInfo.taskType = taskType
        mainWindow.webContents.send(CommunicateAPIName.UpdateTaskItem, taskItemInfo)
    }

    deleteTaskItemToRenderer = (taskItem: TaskModel | TaskSetModel, taskType: TaskType): void => {
        const taskItemInfo: TaskItem = taskItem.get()
        taskItemInfo.taskType = taskType
        mainWindow.webContents.send(CommunicateAPIName.DeleteTaskItem, taskItemInfo)
    }
}

export { Scheduler }