import * as fs from 'node:fs'
import * as http from 'node:http'
import * as https from 'node:https'
import * as path from 'node:path'
import * as EventEmitter from 'events'
import { Task, TaskSet, TaskItem, TaskStatus } from '../../share/models'
import { handlePromise } from '../../share/utils'
import { taskQueue } from '../queue'
import { Log } from '../../share/utils'
import { TaskModel } from '../persistence'
import { parserModule } from '../../share/parsers'
import { ProxyChooses, readSetting, writeSetting, Setting } from '../../share/utils'
import { globalSetting } from '../../share/global'
import { getDownloadHeaders } from '../../share/http/header'
import { getProxySettings, ProxySettings, ProxySetting } from "get-proxy-settings"
import { generateRequestOption } from '../../share/http/option'
import { Protocol } from '../../share/http/constants'

enum DownloaderEvent {
    Done = 'Done',
    Fail = 'Fail'
}

class Downloader extends EventEmitter {
    taskNo: number
    task: TaskModel
    // parentTask: TaskSet

    // protocol: string
    fd: number
    filePath: string
    // requestModule: any
    // requestOptions: http.RequestOptions
    
    constructor(taskNo: number) {
        super()
        this.taskNo = taskNo
        try {
            this.task = taskQueue.getTaskItem(taskNo) as TaskModel
        } catch (error: any) {
            Log.errorLog(error)
        }
        this.filePath = path.join(this.task.location, this.task.name)
    }

    async download(): Promise<void> {
        if (!fs.existsSync(this.filePath)) {
            this.fd = fs.openSync(this.filePath, 'w')
        } else {
            this.fd = fs.openSync(this.filePath, 'r+')
        }
    }

    clearResource(): void {
        fs.closeSync(this.fd)
    }

    done = (): void => {
        this.clearResource()
        this.emit(DownloaderEvent.Done)
        Log.infoLog(`Task ${this.task.name} downloads succeed.`)
    }

    fail = (): void => {
        this.clearResource()
        this.emit(DownloaderEvent.Fail)
        Log.infoLog(`Task ${this.task.name} downloads failed, taskNo ${this.taskNo}.`)
    }
}


export { Downloader, DownloaderEvent }