import * as http from 'node:http'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as EventEmitter from 'events'
import taskQueue from '../queue'
import { Log } from '../../share/utils'
import parserModule from '../../share/parsers'
import { TaskModel } from '../persistence/model_type'
import { generateRequestOption, getDownloadHeaders } from '../../share/http/options'
import { Parser } from '../../share/parsers/parser'

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
        this.task = taskQueue.getTask(taskNo) as TaskModel
        this.filePath = path.join(this.task.location, this.task.name)
    }

    async generateDownloadOption(): Promise<http.RequestOptions> {
        const option: http.RequestOptions = await generateRequestOption(this.task.downloadUrl, getDownloadHeaders)
        const parser: Parser= parserModule.getParser(this.task.parserNo)
        if (parser.requestHeaders) {
            option.headers = {
                ...option.headers,
                ...parser.requestHeaders
            }
        }
        return option
    }

    async download(): Promise<void> {
        const parentPath: string = path.dirname(this.filePath)
        if (!fs.existsSync(parentPath)) {
            fs.mkdirSync(parentPath, { recursive: true });
        }
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