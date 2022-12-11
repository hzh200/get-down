import * as fs from 'node:fs'
import * as http from 'node:http'
import * as path from 'node:path'
import * as EventEmitter from 'events'
import axios, { AxiosResponse, AxiosRequestHeaders, AxiosRequestConfig } from 'axios'
import { Task, TaskSet, TaskItem, TaskStatus } from '../../../common/models'
import { handlePromise } from '../../../common/utils'
import { taskQueue } from '../../queue'
import { Log } from '../../../common/log'
import { TaskModel } from '../../persistence'
import { parserModule } from '../../../common/parsers'
import { readSetting, writeSetting } from '../../../common/setting'

class Downloader extends EventEmitter {
    taskNo: number
    task: TaskModel
    // parentTask: TaskSet
    requestHeaders: AxiosRequestHeaders = {
        // "Host": "github.com",
        // 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
        // it's added when requesting a redirect href
        // "Referer":         "https://github.com",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        // server wouldn't return a Content-Length header when setting Connection to keep-alive
        // "Connection":      "keep-alive",
        // check if server supports range download
        // 'Range': 'bytes=0-0'
    }
    requestOptions: AxiosRequestConfig<any> = {
        responseType: 'stream',
        headers: this.requestHeaders
    }
    fd: number
    filePath: string
    // for partial download only
    partialStreamMap: Map<string, http.IncomingMessage> = new Map()
    setting: {[key: string]: any}
    
    constructor(taskNo: number) {
        super()
        this.taskNo = taskNo
        try {
            this.task = taskQueue.getTaskItem(taskNo) as TaskModel
        } catch (error: any) {
            Log.errorLog(error)
        }

        this.filePath = path.join(this.task.location, this.task.name)

        // if (parserDownloadOptionMap && parserDownloadOptionMap.has(this.task.parserNo)) {
        //     let parserDownloadOption = parserDownloadOptionMap.get(this.task.parserNo) as {[key: string]: any}
        //     if (parserDownloadOption.downloadHeaders) {
        //         this.requestOptions.headers = parserDownloadOption.downloadHeaders
        //     }
        // } 
        this.setting = readSetting()
        if (this.task.useProxy && this.setting.proxy.host != '' && this.setting.proxy.port != -1) {
            this.requestOptions.proxy = this.setting.proxy
        }

        // this.parentTask = taskQueue.getTaskItem(this.task.parent) as TaskSet
        // this.download()
    }

    async download() {
        if (!fs.existsSync(this.filePath)) {
            this.fd = fs.openSync(this.filePath, 'w')
        } else {
            this.fd = fs.openSync(this.filePath, 'r+')
        }
    }
    
    // for partial download only
    pause() {
        for (const [uuid, stream] of this.partialStreamMap) {
            
        }
        this.clear()
    }

    cancel() {

    }

    finish() {
        this.clear()
        this.emit('finish')
    }

    fail() {
        this.clear()
        this.emit('fail')
    }

    clear() {
        fs.closeSync(this.fd)
    }
}


export { Downloader }