import * as fs from 'node:fs'
import * as http from 'node:http'
import * as path from 'node:path'
import * as EventEmitter from 'events'
import axios, { AxiosResponse, AxiosRequestConfig } from 'axios'
import { Task, TaskSet, TaskItem, TaskStatus } from '../../../common/models'
import { handlePromise } from '../../../common/utils'
import { taskQueue } from '../../queue'
import { Log } from '../../../common/log'
import { TaskModel } from '../../persistence'
import { parserModule } from '../../../common/parsers'
import { readSetting, writeSetting } from '../../../common/setting'
import { Downloader } from "./downloader"

class DirectDownloader extends Downloader {
    constructor(taskNo: number) {
        super(taskNo)
    }

   async download() {
        super.download()

        let [error, response] = await handlePromise<AxiosResponse>(axios.get(this.task.downloadUrl, this.requestOptions))
        if (error) {
            Log.errorLog(`Task ${this.task.name} downloads failed, taskNo ${this.taskNo}.`)
            Log.errorLog(error)
            this.fail()
            return
        }
        let stream: http.IncomingMessage = (response as AxiosResponse).data
        // stream.setEncoding('')
        stream.on('data', async (chunk) => {
            const written: number = fs.writeSync(this.fd, chunk, 0, chunk.length, this.task.progress)
            if (written !== chunk.length) {
                Log.errorLog(`Written bytes' number and chunk's length is not equal in task ${this.task.name}'s downloading procedure.`)
            }
            this.task.progress += written
        })
        stream.on('error', (error: any) => {
            Log.errorLog(error.toString())
        })
        stream.on('close', () => {Log.infoLog(`Task ${this.task.name} downloads directly succeed.`)
            console.log(this.task.progress)
            if (!stream.complete) {
                Log.errorLog(`Task ${this.task.name} downloads failed, taskNo ${this.taskNo}.`)
                this.fail()
            }
            this.finish()
            
        })
    }

    // for partial download only
    pause() {
        super.pause()
    }

    cancel() {
        super.cancel()
    }

    finish() {
        super.finish()
    }

    fail() {
        super.fail()
    }

    clear() {
        super.clear()
    }
}


export { DirectDownloader }