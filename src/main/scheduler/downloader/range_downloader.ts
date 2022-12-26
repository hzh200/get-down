import * as fs from 'node:fs'
import * as http from 'node:http'
import * as path from 'node:path'
import * as EventEmitter from 'events'
import { Task, TaskSet, TaskItem, TaskStatus } from '../../../common/models'
import { handlePromise } from '../../../common/utils'
import { taskQueue } from '../../queue'
import { Log } from '../../../common/log'
import { TaskModel } from '../../persistence'
import { parserModule } from '../../../common/parsers'
import { Downloader } from "./downloader"

const { v4: uuidv4 } = require('uuid');

class RangeDownloader extends Downloader {
    constructor(taskNo: number) {
        super(taskNo)
    }

    async download() {
        super.download()
    }

    // partialDownload = () => {
    //     const rangeLength: number = 1024 * 1024 // 1 MB
    //     const rangeLimit: number = 30
    //     const rangeMap: Map<string, Array<number>> = new Map<string, Array<number>>()
    //     let partialDownloadingNumber = 0

    //     if (this.task.downloadRanges.length === 0 && this.task.status !== TaskStatus.done) {
    //         this.task.downloadRanges.splice(0, 0, [0, this.task.size - 1])
    //     }
        
    //     const partialTimer: NodeJS.Timer = setInterval(() => {
    //         for (let i = 0; i < (rangeLimit - partialDownloadingNumber > 10 ? 10 : rangeLimit - partialDownloadingNumber) && (this.task.downloadRanges as Array<Array<number>>).length !== 0; i++) {
    //             const range: Array<number> = getPartialRange()
    //             const uuid: string = uuidv4()
    //             rangeMap.set(uuid, range)
    //             downloadRange(uuid)
    //             partialDownloadingNumber += 1
    //         }
    //         if ((this.task.downloadRanges as Array<Array<number>>).length === 0 && rangeMap.size === 0 && this.task.progress >= this.task.size) {
    //             clearInterval(partialTimer)
    //             this.finish()
    //             Log.infoLog(`Task ${this.task.name} downloads partially succeed.`)
    //         }
    //     }, 500)

    //     const getPartialRange = (): Array<number> => {
    //         const ranges: Array<Array<number>> = this.task.downloadRanges
    //         if (!ranges) {
    //             throw new Error('downloadRanges is undefined.')
    //         }      
    //         if (ranges.length === 0) {
    //             throw new Error('No range is left to be allocated.')
    //         }
    //         if (ranges[0][1] - ranges[0][0] <= rangeLength) {
    //             return ranges.splice(0, 1)[0]
    //         } else {
    //             const left = ranges[0][0]
    //             ranges[0][0] += rangeLength
    //             return [left, ranges[0][0] - 1]
    //         }
    //     }
    //     const returnPartialRange = (range: Array<number>): void => {
    //         const ranges: Array<Array<number>> = this.task.downloadRanges as Array<Array<number>>
    //         ranges.splice(0, 0, range)
    //     }
    //     const downloadRange = async (uuid: string) => {
    //         const range: Array<number> = rangeMap.get(uuid) as Array<number>
    //         // console.log(range)
    //         let requestOptions: AxiosRequestConfig<any> = {}
    //         Object.assign(requestOptions, this.requestOptions)
    //         if (!requestOptions.headers) {
    //             requestOptions.headers = {}
    //         }
    //         requestOptions.headers['Range'] = `bytes=${range[0]}-${range[1]}`
    //         // console.log(this.requestOptions)
    //         let [error, response]: [Error | undefined, AxiosResponse] = await handlePromise<AxiosResponse>(axios.get(this.task.url, this.requestOptions))
    //         if (error) {
    //             Log.errorLog(error)
    //             this.fail()
    //             return
    //         }
    //         // console.log(response?.headers)
    //         let stream: http.IncomingMessage = response.data
    //         this.partialStreamMap.set(uuid, stream)
    //         stream.on('data', async (chunk: Buffer) => {
    //             const written: number = fs.writeSync(this.fd, chunk, 0, chunk.length, range[0])
    //             // await updateTaskProgressGlobal(this.taskNo, this.task.progress + written)
    //             range[0] += written
    //             this.task.progress += written
    //         })
    //         stream.on('error', (error: any) => {
    //             Log.errorLog(error)
    //         })
    //         stream.on('close', () => {
    //             if (!stream.complete) {
    //                 downloadRange(uuid)
    //                 return
    //             }
    //             rangeMap.delete(uuid)
    //         })
    //     }
    // }

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


export { RangeDownloader }