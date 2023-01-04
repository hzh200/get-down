import { Task, TaskSet, TaskItem, TaskStatus } from '../../share/models'
import { TaskField } from '../../share/models/model_type'
import { handlePromise } from '../../share/utils'
import { ipcMain, IpcMainEvent, IpcRendererEvent } from 'electron'
import { mainWindow } from '../main'

import { taskQueue } from '../queue'
import { getDownloader, Downloader, RangeDownloader, DownloaderEvent } from '../downloaders'
import { TaskModel, createTask, createTaskSet, updateTask, updateTaskStatus, deleteTask, getAllTasks } from '../persistence'
import { Log } from '../../share/utils'
import { CommunicateAPIName } from '../../share/communication'

const maxDownloadLimit: number = 3

class Scheduler {
    downloaderMap: Map<number, Downloader> = new Map()
    downloaderTaskTimerMap: Map<number, NodeJS.Timer> = new Map()
    constructor () {
        // Send tasks in database to the newly created task list interface
        getAllTasks().then(preTasks => {
            preTasks.forEach(task => {
                taskQueue.addTaskItem(task.taskNo, task)
                this.addTaskItemToRenderer(task)
            })
        })

        setInterval(() => {
            if (this.downloaderMap.size < maxDownloadLimit) {
                const taskNo: number | null = taskQueue.getWaitingTaskNo()
                if (!taskNo) {
                    return
                }
                const task: TaskModel = taskQueue.getTaskItem(taskNo) as TaskModel
                const downloader: Downloader = getDownloader(taskNo)
                const downloadTimer: NodeJS.Timer = setInterval(() => {
                    updateTask(task)
                    this.updateTaskItemToRenderer(task)
                }, 200)
                this.downloaderMap.set(taskNo, downloader)
                this.downloaderTaskTimerMap.set(taskNo, downloadTimer)

                downloader.on(DownloaderEvent.Done, () => {
                    this.downloaderMap.delete(taskNo)
                    clearInterval(this.downloaderTaskTimerMap.get(taskNo))
                    this.downloaderTaskTimerMap.delete(taskNo)
                    task.status = TaskStatus.done
                    updateTask(task)
                    this.updateTaskItemToRenderer(task)
                })
                downloader.on(DownloaderEvent.Fail, () => {
                    this.downloaderMap.delete(taskNo)
                    clearInterval(this.downloaderTaskTimerMap.get(taskNo))
                    this.downloaderTaskTimerMap.delete(taskNo)
                    task.status = TaskStatus.failed
                    updateTask(task)
                    this.updateTaskItemToRenderer(task)
                })

                task.status = TaskStatus.downloading
                updateTaskStatus(task)
                this.updateTaskItemToRenderer(task)
                downloader.download()

                // const parentNo = (taskQueue.getTaskItem(taskNo) as Task).parent
                // if (parentNo && this.downloadingTaskSetNoList.indexOf(parentNo) === -1) {
                //     this.downloadingTaskSetNoList.push(parentNo)
                //     // this.downloaderMap.set(parentNo, new Downloader(parentNo))
                //     updateTaskStatusGlobal(parentNo, TaskStatus.downloading)
                // }
                }
        }, 50)

        ipcMain.on(CommunicateAPIName.AddTask, async (_event: IpcMainEvent, taskInfo: Task): Promise<void> => {
            taskInfo.status = TaskStatus.waiting
            taskInfo.progress = 0
            if (taskInfo.isRange) {
                taskInfo.downloadRanges = [[0, taskInfo.size as number - 1]]
            }
            const [error, task]: [Error | undefined, TaskModel] = await handlePromise<TaskModel>(createTask(taskInfo))
            if (error) {
                Log.errorLog(error)
            }
            taskQueue.addTaskItem(task.taskNo, task)
            this.addTaskItemToRenderer(task)
        })
        ipcMain.on(CommunicateAPIName.ResumeTasks, async (_event: IpcMainEvent, taskNos: Array<number>): Promise<void> => {
            for (const taskNo of taskNos) {
                const task: TaskModel | null = taskQueue.getTaskItem(taskNo)
                if (task && (task.get(`${TaskField.status}`) === TaskStatus.failed || task.get(`${TaskField.status}`) === TaskStatus.paused)) {
                    // const downloader: Downloader | undefined = this.downloaderMap.get(taskNo)
                    // if (!downloader) {
                    //     continue
                    // }
                    // downloader.resume()
                    task.status = TaskStatus.waiting
                    updateTaskStatus(task)
                    this.updateTaskItemToRenderer(task)
                }
            }
        })
        ipcMain.on(CommunicateAPIName.PauseTasks, (_event: IpcMainEvent, taskNos: Array<number>): void => {
            for (const taskNo of taskNos) {
                const task: TaskModel | null = taskQueue.getTaskItem(taskNo)
                if (task && task.get(`${TaskField.status}`) === TaskStatus.downloading && task.isRange) {
                    const downloader: Downloader | undefined = this.downloaderMap.get(taskNo)
                    if (!downloader) {
                        continue
                    }
                    this.downloaderMap.delete(taskNo)
                    clearInterval(this.downloaderTaskTimerMap.get(taskNo))
                    this.downloaderTaskTimerMap.delete(taskNo)
                    ;(downloader as RangeDownloader).finish()
                    task.status = TaskStatus.paused
                    updateTask(task)
                    this.updateTaskItemToRenderer(task)
                }
            }
        })
        ipcMain.on(CommunicateAPIName.DeleteTasks, async (_event: IpcMainEvent, taskNos: Array<number>): Promise<void> => {
            for (const taskNo of taskNos) {
                const task: TaskModel | null = taskQueue.getTaskItem(taskNo)
                if (task && task.isRange) {
                    const downloader: Downloader | undefined = this.downloaderMap.get(taskNo)
                    if (!downloader) {
                        continue
                    }
                    ;(downloader as RangeDownloader).finish()
                    const [error, _]: [Error | undefined, void] = await handlePromise<void>(deleteTask(task))
                    if (error) {
                        throw error
                    }
                }
            }
        })
    }

    addTaskItemToRenderer = (task: TaskModel): void => {
        mainWindow.webContents.send(CommunicateAPIName.NewTaskItem, task.get())
    }

    updateTaskItemToRenderer = (task: TaskModel): void => {
        mainWindow.webContents.send(CommunicateAPIName.UpdateTaskItem, task.get())
    }
}

export { Scheduler }