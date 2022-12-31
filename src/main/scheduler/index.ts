import { Task, TaskSet, TaskItem, TaskStatus } from '../../common/models'
import { TaskField } from '../../common/models/model_type'
import { handlePromise } from '../../common/utils'
import { ipcMain, IpcMainEvent, IpcRendererEvent } from 'electron'
import { mainWindow } from '../main'

import { taskQueue } from '../queue'
import { Downloader, getDownloader } from '../downloader'
import { TaskModel, createTask, createTaskSet, updateTask, updateTaskStatus, deleteTask, getAllTasks } from '../persistence'
import { Log } from '../../common/log'

const maxDownloadLimit: number = 3

class Scheduler {
    downloaderMap: Map<number, Downloader> = new Map()
    downloaderTaskTimerMap: Map<number, NodeJS.Timer> = new Map()
    constructor () {
        // Send tasks in database to the newly created task list interface
        getAllTasks().then(preTasks => {
            preTasks.forEach(task => {
                mainWindow.webContents.send('new-task-item', task.get())
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

                downloader.on('done', () => {
                    this.downloaderMap.delete(taskNo)
                    clearInterval(this.downloaderTaskTimerMap.get(taskNo))
                    this.downloaderTaskTimerMap.delete(taskNo)
                    task.status = TaskStatus.done
                    updateTask(task)
                    this.updateTaskItemToRenderer(task)
                })
                downloader.on('fail', () => {
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

        ipcMain.on('add-task', async (_event: IpcMainEvent, taskInfo: Task): Promise<void> => {
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
        ipcMain.on('resume-tasks', async (_event: IpcMainEvent, taskNos: Array<number>): Promise<void> => {
            for (const taskNo of taskNos) {
                const task: TaskModel | null = taskQueue.getTaskItem(taskNo)
                if (task && (task.get(`${TaskField.status}`) === TaskStatus.failed || task.get(`${TaskField.status}`) === TaskStatus.paused)) {
                    const downloader: Downloader | undefined = this.downloaderMap.get(taskNo)
                    if (!downloader) {
                        continue
                    }
                    downloader.resume()
                    task.status = TaskStatus.waiting
                    updateTaskStatus(task)
                }
            }
        })
        ipcMain.on('pause-tasks', async (_event: IpcMainEvent, taskNos: Array<number>): Promise<void> => {
            for (const taskNo of taskNos) {
                const task: TaskModel | null = taskQueue.getTaskItem(taskNo)
                if (task && task.get(`${TaskField.status}`) === TaskStatus.downloading) {
                    const downloader: Downloader | undefined = this.downloaderMap.get(taskNo)
                    if (!downloader) {
                        continue
                    }
                    downloader.pause()
                    task.status = TaskStatus.paused
                    updateTaskStatus(task)
                }
            }
        })
        ipcMain.on('delete-tasks', async (_event: IpcMainEvent, taskNos: Array<number>): Promise<void> => {
            for (const taskNo of taskNos) {
                const task: TaskModel | null = taskQueue.getTaskItem(taskNo)
                if (!task) {
                    continue
                }
                const downloader: Downloader | undefined = this.downloaderMap.get(taskNo)
                if (!downloader) {
                    continue
                }
                downloader.pause()
                const [error, _]: [Error | undefined, void] = await handlePromise<void>(deleteTask(task))
                if (error) {
                    throw error
                }
            }
        })
    }

    addTaskItemToRenderer = (task: TaskModel): void => {
        mainWindow.webContents.send('new-task-item', task.get())
    }

    updateTaskItemToRenderer = (task: TaskModel): void => {
        mainWindow.webContents.send('update-task-item', task.get())
    }
}

export { Scheduler }