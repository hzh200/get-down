import * as fs from 'node:fs'
import * as http from 'node:http'
import * as https from 'node:https'
import * as path from 'node:path'
import * as EventEmitter from 'events'
import { Task, TaskSet, TaskItem, TaskStatus } from '../../common/models'
import { handlePromise } from '../../common/utils'
import { taskQueue } from '../queue'
import { Log } from '../../common/log'
import { TaskModel } from '../persistence'
import { parserModule } from '../../common/parsers'
import { ProxyChooses, readSetting, writeSetting, Setting } from '../../common/setting'
import { globalSetting } from '../../common/global'
import { getDownloadHeaders } from '../../common/http/header'
import { getProxySettings, ProxySettings, ProxySetting } from "get-proxy-settings"
import { Protocol, generateRequestOption } from '../../common/http/option'

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

    clear = (): void => {
        fs.closeSync(this.fd)
    }
    
    pause = (): void => {
        
    }

    resume = (): void => {

    }

    delete = (): void => {

    }

    done = (): void => {
        this.clear()
        this.emit('done')
        Log.infoLog(`Task ${this.task.name} downloads succeed.`)
    }

    fail = (): void => {
        this.clear()
        this.emit('fail')
        Log.infoLog(`Task ${this.task.name} downloads failed, taskNo ${this.taskNo}.`)
    }
}


export { Downloader }