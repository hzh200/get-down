import * as http from 'node:http'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as EventEmitter from 'events'
import taskQueue from '../queue'
import { Log, handlePromise } from '../../share/utils'
import parserModule from '../../share/parsers'
import { TaskModel } from '../persistence/model_type'
import { generateRequestOption, getDownloadHeaders } from '../../share/http/options'
import { Parser } from '../../share/parsers/parser'

enum DownloaderEvent {
    Done = 'Done',
    Fail = 'Fail',
    Reparse = 'Reparse' // For range downloader only. 
}

class Downloader extends EventEmitter {
    taskNo: number
    task: TaskModel
    fd: number
    filePath: string

    constructor(taskNo: number) {
        super()
        this.taskNo = taskNo
        this.task = taskQueue.getTask(taskNo) as TaskModel
        this.filePath = path.join(this.task.location, this.task.name)
    }

    // Entrance of download procedure for Scheduler
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

    // Generate download option based on parser headers.
    async generateDownloadOption(): Promise<http.RequestOptions> {
        const parser: Parser = parserModule.getParser(this.task.parserNo)
        const requestHeaders: http.OutgoingHttpHeaders | undefined = parser.requestHeaders
        return await generateRequestOption(this.task.downloadUrl, getDownloadHeaders, requestHeaders)
    }

    // Clear Download instance resource.
    clear(): void {
        fs.closeSync(this.fd)
    }

    // Task downloads succeed.
    // Clear the download resource and notice the Schedular.
    done = (): void => {
        this.clear()
        this.emit(DownloaderEvent.Done)
        Log.infoLog(`Task ${this.task.name} downloads succeed.`)
    }

    // Task downloads failed.
    // Clear the download resource and notice the Schedular.
    fail = (): void => {
        this.clear()
        this.emit(DownloaderEvent.Fail)
        Log.infoLog(`Task ${this.task.name} downloads failed, taskNo ${this.taskNo}.`)
    }
}

export { Downloader, DownloaderEvent }