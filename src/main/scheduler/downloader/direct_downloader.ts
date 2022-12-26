import * as fs from 'node:fs'
import * as http from 'node:http'
import * as stream from 'node:stream'
import * as https from 'node:https'
import * as path from 'node:path'
import { Task, TaskSet, TaskItem, TaskStatus } from '../../../common/models'
import { handlePromise } from '../../../common/utils'
import { taskQueue } from '../../queue'
import { Log } from '../../../common/log'
import { TaskModel } from '../../persistence'
import { parserModule } from '../../../common/parsers'
import { Downloader } from "./downloader"
import * as zlib from 'node:zlib'

class DirectDownloader extends Downloader {
    constructor(taskNo: number) {
        super(taskNo)
    }

   async download(): Promise<void> {
        await super.download()
        const request: http.ClientRequest = this.requestModule.get(this.options, (response: http.IncomingMessage) => {
            const encoding = response.headers['content-encoding']
            if (encoding) {
                let unzip: zlib.Unzip | zlib.Gunzip | zlib.BrotliDecompress | zlib.Inflate = zlib.createUnzip()
                if (encoding === 'gzip') {
                    unzip = zlib.createGunzip()
                } else if (encoding === 'br') {
                    unzip = zlib.createBrotliDecompress()
                } else if (encoding === 'deflate') {
                    unzip = zlib.createInflate()
                } else {
                    throw new Error('Unsupported Compress Algorithm')
                }
                response.pipe(unzip)
                this.handleResponseStream(unzip)
            } else {
                this.handleResponseStream(response)
            }
        })
        request.on('error', (error: Error) => {
            Log.infoLog(`Task ${this.task.name} downloads failed, taskNo ${this.taskNo}.`)
            Log.errorLog(error.toString())
            this.fail()
        })
    }

    handleResponseStream = (stream: stream.Readable): void => {
        stream.on('data', (chunk: any) => {
            const written: number = fs.writeSync(this.fd, chunk, 0, chunk.length, this.task.progress)
            if (written !== chunk.length) {
                Log.errorLog(`Written bytes' number and chunk's length is not equal in task ${this.task.name}'s downloading procedure.`)
                stream.emit('error')
            }
            this.task.progress += written
        })
        stream.on('error', (error: Error) => {
            Log.infoLog(`Task ${this.task.name} downloads failed, taskNo ${this.taskNo}.`)
            Log.errorLog(error.toString())
            this.fail()
        })
        stream.on('end', () => {
            Log.infoLog(`Task ${this.task.name} downloads directly succeed.`)
            this.finish()
        })
    }
}


export { DirectDownloader }