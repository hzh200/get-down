import { Task, TaskSet, TaskItem, TaskStatus } from '../../common/models'
import { handlePromise } from '../../common/utils'
import { ipcMain, IpcMainEvent, IpcRendererEvent } from 'electron'
import { mainWindow } from '../main'

import { taskQueue } from '../queue'
import { Downloader, getDownloader } from '../downloader'
import { TaskModel, createTask, createTaskSet, updateTask, updateTaskStatus, updateTaskProgress, updateTaskRanges, deleteTask, getAllTasks } from '../persistence'
import { Log } from '../../common/log'

class Scheduler {
    maxDownloadLimit: number = 3

    downloadingTaskNoList: Array<number> = []
    // downloadingTaskSetNoList : Array<number> = []
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
            if (this.downloadingTaskNoList.length < this.maxDownloadLimit) {
                const taskNo = taskQueue.getWaitingTaskNo()
                if (taskNo === -1) {
                    return
                }
                const task: TaskModel = taskQueue.getTaskItem(taskNo)
                const downloader = getDownloader(taskNo)

                const downloadTimer: NodeJS.Timer = setInterval(() => {
                    updateTask(task)
                    mainWindow.webContents.send('update-task-item', task.get())
                }, 200)
                this.downloadingTaskNoList.push(taskNo)
                this.downloaderTaskTimerMap.set(taskNo, downloadTimer)
                this.downloaderMap.set(taskNo, downloader)

                downloader.on('done', () => {
                    this.downloadingTaskNoList = this.downloadingTaskNoList.filter(downloadingTaskNo => downloadingTaskNo !== taskNo)
                    clearInterval(this.downloaderTaskTimerMap.get(taskNo))
                    this.downloaderTaskTimerMap.delete(taskNo)
                    this.downloaderMap.delete(taskNo)
                    task.status = TaskStatus.done
                    mainWindow.webContents.send('update-task-item', task.get())
                    updateTask(taskQueue.getTaskItem(taskNo))
                })
                downloader.on('fail', () => {
                    this.downloadingTaskNoList = this.downloadingTaskNoList.filter(downloadingTaskNo => downloadingTaskNo !== taskNo)
                    clearInterval(this.downloaderTaskTimerMap.get(taskNo))
                    this.downloaderTaskTimerMap.delete(taskNo)
                    this.downloaderMap.delete(taskNo)
                    task.status = TaskStatus.failed
                    mainWindow.webContents.send('update-task-item', task.get())
                    updateTask(taskQueue.getTaskItem(taskNo))
                })

                updateTaskStatus(task, TaskStatus.downloading)
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
            taskQueue.addTaskItem((task as TaskModel).taskNo, task)
            mainWindow.webContents.send('new-task-item', (task as TaskModel).get())
        })
        ipcMain.on('resume-tasks', async (_event: IpcMainEvent, taskNos: Array<number>): Promise<void> => {
            for (const taskNo of taskNos) {
                const task: TaskModel = taskQueue.getTaskItem(taskNo)
                if (task.get('status') === TaskStatus.failed || task.get('status') === TaskStatus.paused) {
                    updateTaskStatus(task, TaskStatus.waiting)
                }
            }
        })
        ipcMain.on('pause-tasks', async (_event: IpcMainEvent, taskNos: Array<number>): Promise<void> => {
            for (const taskNo of taskNos) {
                const task: TaskModel = taskQueue.getTaskItem(taskNo)
                this.getDownloader(taskNo).pause()
                if (task.get('status') === TaskStatus.downloading) {
                    updateTaskStatus(task, TaskStatus.paused)
                }
            }
        })
        ipcMain.on('delete-tasks', async (_event: IpcMainEvent, taskNos: Array<number>): Promise<void> => {
            for (const taskNo of taskNos) {
                const task: TaskModel = taskQueue.getTaskItem(taskNo)
                this.getDownloader(taskNo).pause()
                const [error, _]: [Error | undefined, void] = await handlePromise<void>(deleteTask(task))
                if (error) {
                    throw error
                }
            }
        })
    }

    getDownloader = (taskNo: number): Downloader => {
        if (!this.downloaderMap.has(taskNo)) {
            throw new Error('No downloader is found')
        }
        return this.downloaderMap.get(taskNo) as Downloader
    }
}

export { Scheduler }