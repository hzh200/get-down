import { ipcMain, IpcMainEvent, IpcRendererEvent } from 'electron';
import { Task, TaskSet, TaskItem, TaskStatus, DownloadType, TaskType } from '../share/global/models';
import { TaskModel, TaskSetModel, ModelField } from './persistence/model_types';
import { mainWindow } from './main';
import taskQueue from './queue';
import { getDownloader, Downloader, RangeDownloader, DownloaderEvent } from './downloaders';
import { 
    createTaskModel,
    // getAllTaskModels,
    updateTaskModel,
    // updateTaskModelStatus,
    updateTaskModelParent,
    deleteTaskModel,
    deleteTaskModels,
    createTaskSetModel,
    // getAllTaskSetModels,
    updateTaskSetModel,
    // updateTaskSetModelStatus,
    updateTaskSetModelChildren,
    deleteTaskSetModel,
    deleteTaskSetModels,
    // getAllSequenceModels,
    getSequencedRecords,
    updateTaskStatus,
    updateTaskSetStatus
} from './persistence';
import { Log, handlePromise, handleAsyncCallback } from '../share/utils';
import { CommunicateAPIName } from '../share/global/communication';
import callbackModule, { Callback } from '../share/extractors/callbacks';
import { getWindowsValidFilename } from '../share/utils';

const maxDownloadLimit: number = 3;

class Scheduler {
    taskProcesserMap: Map<number, [Downloader, NodeJS.Timer]> = new Map();
    taskSetProcesserMap: Map<number, NodeJS.Timer> = new Map();
    constructor () {
        // Read from the database for all existing tasks and taskSets, send them to the newly created task list in renderer process interface.
        getSequencedRecords().then((records: Array<TaskModel | TaskSetModel>) => {
            for (const record of records) {
                if (record instanceof TaskModel) {
                    taskQueue.addTask(record.taskNo, record);
                    this.addTaskItemToRenderer(record, TaskType.Task);
                } else { // TaskSetModel
                    taskQueue.addTaskSet(record.taskNo, record);
                    this.addTaskItemToRenderer(record, TaskType.TaskSet);
                }
            }
        }).catch((error: Error) => {
            Log.fatal(error)
        });

        // Check out every once in a while if some waiting tasks can be started.
        setInterval(handleAsyncCallback(async (): Promise<void> => {
            if (this.taskProcesserMap.size < maxDownloadLimit) {
                const taskNo: number | null = taskQueue.getWaitingTaskNo();
                if (!taskNo) return;
                const parentTaskSetNo: number | null = this.getParentTaskNo(taskNo);
                const downloader: Downloader = await this.downloadTask(taskNo);
                const task: TaskModel = taskQueue.getTask(taskNo) as TaskModel;

                if (parentTaskSetNo) {
                    this.downloadTaskSet(parentTaskSetNo);
                }

                downloader.on(DownloaderEvent.Done, handleAsyncCallback(async (): Promise<void> => {        
                    const callback: Callback = callbackModule.getCallback(task.extractorNo);  
                    const taskCallback = callback.taskCallback;
                    const taskSetCallback = callbackModule.getCallback(task.extractorNo).taskSetCallback;
                    if (taskCallback) {
                        const [error, _]: [Error | undefined, void] = await handlePromise<void>(taskCallback(taskNo));
                        if (error) {
                            Log.error(error);
                            await this.finishTask(taskNo, TaskStatus.Failed);
                            return;
                        }
                    }
                    await this.finishTask(taskNo, TaskStatus.Done);
                    
                    if (parentTaskSetNo) {
                        for (const childTaskNo of this.getSortedChildren(parentTaskSetNo)) {
                            if (this.taskProcesserMap.has(childTaskNo)) return;
                        }
                        if (taskSetCallback) {
                            const taskSet: TaskSetModel = taskQueue.getTaskSet(parentTaskSetNo) as TaskSetModel;
                            await updateTaskSetStatus(taskSet, TaskStatus.Processing);
                            const [error, _]: [Error | undefined, void] = await handlePromise<void>(taskSetCallback(parentTaskSetNo));
                            if (error) {
                                Log.error(error);
                                await updateTaskSetStatus(taskSet, TaskStatus.Failed);
                                return;
                            }
                        }
                        await this.finishTaskSet(parentTaskSetNo);
                    }
                }));

                downloader.on(DownloaderEvent.Fail, handleAsyncCallback(async (): Promise<void> => {
                    await this.finishTask(taskNo, TaskStatus.Failed);
                    if (parentTaskSetNo) {
                        const taskSet: TaskSetModel = taskQueue.getTaskSet(parentTaskSetNo) as TaskSetModel;
                        for (const childTaskNo of taskSet.children) {
                            if (this.taskProcesserMap.has(childTaskNo)) return;
                        }
                        await this.finishTaskSet(parentTaskSetNo);
                    }
                }));

                // downloader.download().catch((error: Error) => {
                //     Log.error(error);
                // })

                // [Error]Cannot read properties of undefined (reading 'filePath') TypeError: Cannot read properties of undefined (reading 'filePath');
                // await handleAsyncCallback(downloader.download)();

                await downloader.download();
            }
        }), 100);

        ipcMain.on(CommunicateAPIName.AddTask, handleAsyncCallback(async (_event: IpcMainEvent, taskInfo: Task): Promise<void> => {
            taskInfo.status = TaskStatus.Waiting;
            taskInfo.progress = 0;
            if (taskInfo.downloadType === DownloadType.Range) {
                taskInfo.downloadRanges = [[0, taskInfo.size as number - 1]];
            }
            taskInfo.name = getWindowsValidFilename(taskInfo.name);
            const [error, task]: [Error | undefined, TaskModel] = await handlePromise<TaskModel>(createTaskModel(taskInfo));
            if (error) {
                Log.error(error);
            }
            taskQueue.addTask(task.taskNo, task);
            this.addTaskItemToRenderer(task, TaskType.Task);
        }));
        ipcMain.on(CommunicateAPIName.AddTaskSet, handleAsyncCallback(async (_event: IpcMainEvent, [taskSetInfo, taskInfos]: [TaskSet, Array<Task>]): Promise<void> => {
            taskSetInfo.status = TaskStatus.Waiting;
            taskSetInfo.progress = 0;
            taskSetInfo.children = [];
            taskSetInfo.name = getWindowsValidFilename(taskSetInfo.name);
            const [taskSetError, taskSet]: [Error | undefined, TaskSetModel] = await handlePromise<TaskSetModel>(createTaskSetModel(taskSetInfo));
            if (taskSetError) {
                Log.error(taskSetError);
            }
            taskQueue.addTaskSet(taskSet.taskNo, taskSet);
            this.addTaskItemToRenderer(taskSet, TaskType.TaskSet);
            for (const taskInfo of taskInfos) {
                taskInfo.status = TaskStatus.Waiting;
                taskInfo.progress = 0;
                if (taskInfo.downloadType === DownloadType.Range) {
                    taskInfo.downloadRanges = [[0, taskInfo.size as number - 1]];
                }
                taskInfo.name = getWindowsValidFilename(taskInfo.name);
                const [taskError, task]: [Error | undefined, TaskModel] = await handlePromise<TaskModel>(createTaskModel(taskInfo));
                if (taskError) {
                    Log.error(taskError);
                }
                task.parent = taskSet.taskNo;
                await updateTaskModelParent(task);
                taskSet.children.push(task.taskNo);
                taskQueue.addTask(task.taskNo, task);
                this.addTaskItemToRenderer(task, TaskType.Task);
            }
            await updateTaskSetModelChildren(taskSet);
        }));
        ipcMain.on(CommunicateAPIName.PauseTasks, handleAsyncCallback(async (_event: IpcMainEvent, selectedTaskNos: Array<[number, TaskType]>): Promise<void> => {
            selectedTaskNos = this.getDistinctTaskNos(selectedTaskNos);
            for (const [taskNo, taskType] of selectedTaskNos) {
                if (taskType === TaskType.Task) {
                    const task: TaskModel = taskQueue.getTask(taskNo) as TaskModel;
                    if (task.downloadType === DownloadType.Range && 
                            (task.get(`${ModelField.status}`) === TaskStatus.Downloading || task.get(`${ModelField.status}`) === TaskStatus.Waiting)) {
                        await this.finishTask(task.taskNo, TaskStatus.Paused);
                    }
                } else { // TaskSet
                    for (const childTaskNo of this.getReversedChildren(taskNo)) {
                        const child: TaskModel | null = taskQueue.getTask(childTaskNo);
                        if (!child) continue;
                        if (child.downloadType === DownloadType.Range && 
                                (child.get(`${ModelField.status}`) === TaskStatus.Downloading || child.get(`${ModelField.status}`) === TaskStatus.Waiting)) {
                            await this.finishTask(child.taskNo, TaskStatus.Paused);
                        }
                    }
                    await this.finishTaskSet(taskNo);
                }
            }
        }));
        ipcMain.on(CommunicateAPIName.ResumeTasks, handleAsyncCallback(async (_event: IpcMainEvent, selectedTaskNos: Array<[number, TaskType]>): Promise<void> => {
            selectedTaskNos = this.getDistinctTaskNos(selectedTaskNos);
            for (const [taskNo, taskType] of selectedTaskNos) {
                if (taskType === TaskType.Task) {
                    const task: TaskModel = taskQueue.getTask(taskNo) as TaskModel;
                    if (task.downloadType === DownloadType.Range && 
                        (task.get(`${ModelField.status}`) === TaskStatus.Failed || task.get(`${ModelField.status}`) === TaskStatus.Paused)) {
                        await updateTaskStatus(task, TaskStatus.Waiting);
                        this.updateTaskItemToRenderer(task, TaskType.Task);
                    }
                } else { // TaskSet
                    for (const childTaskNo of (taskQueue.getTaskSet(taskNo) as TaskSetModel).children) {
                        const child: TaskModel | null = taskQueue.getTask(childTaskNo);
                        if (!child) continue;
                        await updateTaskStatus(child, TaskStatus.Waiting);
                        this.updateTaskItemToRenderer(child, TaskType.Task);
                    }
                }
            }
        }));
        ipcMain.on(CommunicateAPIName.DeleteTasks, handleAsyncCallback(async (_event: IpcMainEvent, selectedTaskNos: Array<[number, TaskType]>): Promise<void> => {
            selectedTaskNos = this.getDistinctTaskNos(selectedTaskNos);
            for (const [taskNo, taskType] of selectedTaskNos) {
                if (taskType === TaskType.Task) {
                    const task: TaskModel | null = taskQueue.getTask(taskNo);
                    if (!task) continue;
                    if (task.downloadType === DownloadType.Range && 
                        (task.get(`${ModelField.status}`) === TaskStatus.Downloading || task.get(`${ModelField.status}`) === TaskStatus.Waiting)) {
                        await this.finishTask(task.taskNo, TaskStatus.Paused);
                    }
                    await deleteTaskModel(task.taskNo);
                    taskQueue.removeTask(task.taskNo);
                    this.deleteTaskItemToRenderer(task, TaskType.Task);
                } else { // TaskSet
                    const taskSet: TaskSetModel | null = taskQueue.getTaskSet(taskNo);
                    if (!taskSet) continue;
                    for (const childTaskNo of this.getReversedChildren(taskNo)) {
                        const child: TaskModel | null = taskQueue.getTask(childTaskNo);
                        if (!child) continue;
                        await this.finishTask(child.taskNo, TaskStatus.Paused);
                    }
                    await this.finishTaskSet(taskNo);

                    const childrenTaskNo = this.getSortedChildren(taskSet.taskNo).filter((value) => taskQueue.hasTask(value));
                    if (childrenTaskNo.length !== 0) {
                        await deleteTaskModels(childrenTaskNo);
                    }
                    for (const childTaskNo of this.getReversedChildren(taskNo)) {
                        const child: TaskModel | null = taskQueue.getTask(childTaskNo);
                        if (!child) continue;
                        taskQueue.removeTask(childTaskNo);
                        this.deleteTaskItemToRenderer(child, TaskType.Task);
                    }
                    await deleteTaskSetModel(taskSet.taskNo);
                    taskQueue.removeTaskSet(taskSet.taskNo);
                    this.deleteTaskItemToRenderer(taskSet, TaskType.TaskSet);
                }
            }
        }));
    }

    // Start downloading a waiting task and alloc processer resource binding with it's taskNo.
    downloadTask = async (taskNo: number): Promise<Downloader> => {
        const task: TaskModel = taskQueue.getTask(taskNo) as TaskModel;
        const downloader: Downloader = getDownloader(taskNo);
        const taskTimer: NodeJS.Timer = setInterval(handleAsyncCallback(async () => {
            await updateTaskModel(task);
            this.updateTaskItemToRenderer(task, TaskType.Task);
        }), 200);
        this.taskProcesserMap.set(taskNo, [downloader, taskTimer]);
        await updateTaskStatus(task, TaskStatus.Downloading);
        this.updateTaskItemToRenderer(task, TaskType.Task);
        return downloader;
    };
    // Start downloading a waiting taskSet and alloc processer resource binding with it's taskNo.
    downloadTaskSet = (taskNo: number): void => {
        if (this.taskSetProcesserMap.has(taskNo)) return;
        const taskSetTimer: NodeJS.Timer = setInterval(handleAsyncCallback(async () => {
            const taskSet: TaskSetModel = taskQueue.getTaskSet(taskNo as number) as TaskSetModel;
            if (taskSet.status !== TaskStatus.Processing) {
                this.calculateTaskSetStatus(taskSet);
            }
            this.calculateTaskSetProgress(taskSet);
            await updateTaskSetModel(taskSet);
            this.updateTaskItemToRenderer(taskSet, TaskType.TaskSet);

            // Self clearing when no child task is active.
            if (taskSet.status !== TaskStatus.Downloading) {
                clearInterval(this.taskSetProcesserMap.get(taskNo));
                this.taskSetProcesserMap.delete(taskNo);
            }
        }), 200);
        this.taskSetProcesserMap.set(taskNo, taskSetTimer);
    };

    // Finish an activiting task, whether it's done or failed.
    finishTask = async (taskNo: number, status: TaskStatus): Promise<void> => {
        const task: TaskModel = taskQueue.getTask(taskNo) as TaskModel;
        if (this.taskProcesserMap.has(taskNo)) {
            const [downloader, downloadTimer]: [Downloader, NodeJS.Timer] = this.taskProcesserMap.get(taskNo) as [Downloader, NodeJS.Timer];
            if (task.downloadType === DownloadType.Range && status === TaskStatus.Paused) {
                (downloader as RangeDownloader).destroy();
            }
            clearInterval(downloadTimer);
            this.taskProcesserMap.delete(taskNo);
        }
        await updateTaskStatus(task, status);
        this.updateTaskItemToRenderer(task, TaskType.Task);
    };
    // Finish an activiting taskSet.
    finishTaskSet = async (taskNo: number): Promise<void> => {
        clearInterval(this.taskSetProcesserMap.get(taskNo) as NodeJS.Timer);
        this.taskSetProcesserMap.delete(taskNo);
        const taskSet: TaskSetModel = taskQueue.getTaskSet(taskNo) as TaskSetModel;
        this.calculateTaskSetStatus(taskSet);
        this.calculateTaskSetProgress(taskSet);
        await updateTaskSetModel(taskSet);
        this.updateTaskItemToRenderer(taskSet, TaskType.TaskSet);
    };

    // Calculate a taskSet status by suming up it's children's progress.
    calculateTaskSetProgress = (taskSet: TaskSetModel): void => {
        taskSet.progress = 0;
        taskSet.children.forEach((childTaskNo: number, _index: number, _array: Array<number>) => {
            const child: TaskModel | null = taskQueue.getTask(childTaskNo);
            if (child) {
                taskSet.progress += child.progress;
            }
        });
    };

    // Calculate a taskSet status by considering it's children's status all together.
    calculateTaskSetStatus = (taskSet: TaskSetModel): void => {
        const statusMap: Map<TaskStatus, boolean> = new Map();
        taskSet.children.forEach((childTaskNo: number, _index: number, _array: Array<number>) => {
            const child: TaskModel | null = taskQueue.getTask(childTaskNo);
            if (child) {
                statusMap.set(child.status, true);
            }
        })
        if (statusMap.get(TaskStatus.Downloading)) {
            taskSet.status = TaskStatus.Downloading;
        } else if (statusMap.get(TaskStatus.Waiting)) {
            taskSet.status = TaskStatus.Waiting;
        } else if (statusMap.get(TaskStatus.Paused)) {
            taskSet.status = TaskStatus.Paused;
        } else if (statusMap.get(TaskStatus.Failed)) {
            taskSet.status = TaskStatus.Failed;
        } else { // Done
            taskSet.status = TaskStatus.Done;
        }
    };

    // Get tasks which don't have parent and task_sets taskNos.
    getDistinctTaskNos = (taskNos: Array<[number, TaskType]>): Array<[number, TaskType]> => {
        const res: Array<[number, TaskType]> = [];
        for (const [taskNo, taskType] of taskNos) {
            const taskItem: TaskModel | TaskSetModel | null = taskQueue.getTaskItem(taskNo, taskType);
            if (!taskItem) continue;
            if (taskType === TaskType.Task) {
                if ((taskItem as TaskModel).parent && res.includes([(taskItem as TaskModel).parent as number, TaskType.TaskSet])) {
                    continue;
                }
            } else { // TaskSet
                for (const childTaskNo of (taskItem as TaskSetModel).children) {
                    if (res.includes([childTaskNo, TaskType.Task])) {
                        res.splice(res.indexOf([childTaskNo, TaskType.Task]), 1);
                    }
                }
            }
            res.push([taskNo, taskType]);
        }
        return res;
    }
    // Get the parent taskNo of a task, if there is a parent.
    getParentTaskNo = (taskNo: number): number | null => {
        if (!taskQueue.getTask(taskNo)) return null;
        if (!(taskQueue.getTask(taskNo) as TaskModel).parent) return null;
        return (taskQueue.getTask(taskNo) as TaskModel).parent as number;
    };
    // Get children of a taskSet in ascending order of number value.
    getSortedChildren = (taskNo: number): Array<number> => {
        if (!taskQueue.getTaskSet(taskNo)) return [];
        if (!(taskQueue.getTaskSet(taskNo) as TaskSetModel).children) return [];
        const children: Array<number> = [...(taskQueue.getTaskSet(taskNo) as TaskSetModel).children];
        children.sort((a: number, b: number): number => {
            if (a > b) {
                return 1;
            } else if (a < b) {
                return -1;
            } else {
                return 0;
            }
        })
        return children;
    };
    // Get children of a taskSet in descending order of number value.
    getReversedChildren = (taskNo: number): Array<number> => {
        return this.getSortedChildren(taskNo).reverse();
    };

    //
    // Send the newest taskItem info to the renderer process.
    //
    addTaskItemToRenderer = (taskItem: TaskModel | TaskSetModel, taskType: TaskType): void => {
        if (!taskItem) return;
        const taskItemInfo: TaskItem = taskItem.get();
        taskItemInfo.taskType = taskType;
        mainWindow.webContents.send(CommunicateAPIName.NewTaskItem, taskItemInfo);
    };
    updateTaskItemToRenderer = (taskItem: TaskModel | TaskSetModel, taskType: TaskType): void => {
        if (!taskItem) return;
        const taskItemInfo: TaskItem = taskItem.get();
        taskItemInfo.taskType = taskType;
        mainWindow.webContents.send(CommunicateAPIName.UpdateTaskItem, taskItemInfo);
    };
    deleteTaskItemToRenderer = (taskItem: TaskModel | TaskSetModel, taskType: TaskType): void => {
        if (!taskItem) return;
        const taskItemInfo: TaskItem = taskItem.get();
        taskItemInfo.taskType = taskType;
        mainWindow.webContents.send(CommunicateAPIName.DeleteTaskItem, taskItemInfo);
    };
}

export default Scheduler;