import * as fs from 'node:fs'
import * as http from 'node:http'
import * as stream from 'node:stream'
import * as https from 'node:https'
import { handlePromise } from '../../common/utils'
import { Log } from '../../common/log'
import { parserModule } from '../../common/parsers'
import { Downloader } from "./downloader"
import { httpRequest, getDecodingStream, StreamEvent } from '../../common/http/request'
import { generateRequestOption } from '../../common/http/option'
import { getDownloadHeaders, Header } from '../../common/http/header'

const { v4: uuidv4 } = require('uuid')

const rangeLength: number = 1024 * 1024 // 1 MB
const rangeLimit: number = 20

class RangeDownloader extends Downloader {
    rangeMap: Map<string, Array<number>> = new Map<string, Array<number>>()
    responseStreamMap: Map<string, stream.Readable> = new Map<string, stream.Readable>()
    downloadTimer: NodeJS.Timer
    finished: boolean = false
    constructor(taskNo: number) {
        super(taskNo)
    }

    async download(): Promise<void> {
        await super.download()
        this.downloadTimer = setInterval(() => {
            if (this.finished) return
            if ((this.task.downloadRanges as Array<Array<number>>).length === 0 && this.rangeMap.size === 0 && this.task.progress >= this.task.size) {
                this.done()
            }
            for (let i = 0; this.isRangeLeft() && i < (rangeLimit - this.rangeMap.size); i++) {
                const range: Array<number> = this.getPartialRange()
                const uuid: string = uuidv4()
                this.rangeMap.set(uuid, range)
                this.downloadRange(uuid)
            }
        }, 500)
    }

    isRangeLeft = (): boolean => {
        const ranges: Array<Array<number>> = this.task.downloadRanges as Array<Array<number>>
        if (!ranges) {
            return false
        }
        // No range is left to be allocated.
        if (ranges.length === 0) {
            return false
        }
        return true
    }

    getPartialRange = (): Array<number> => {
        const ranges: Array<Array<number>> = this.task.downloadRanges as Array<Array<number>>
        if (ranges[0][1] - ranges[0][0] <= rangeLength) {
            return ranges.splice(0, 1)[0]
        } else {
            const left = ranges[0][0]
            ranges[0][0] += rangeLength
            return [left, ranges[0][0] - 1]
        }
    }

    postPartialRange = (range: Array<number>): void => {
        const ranges: Array<Array<number>> = this.task.downloadRanges as Array<Array<number>>
        ranges.splice(0, 0, range)
    }

    downloadRange = async (uuid: string): Promise<void> => {
        const handleEnd = (): void => {
            this.rangeMap.delete(uuid)
            this.responseStreamMap.delete(uuid)
        }
        const handleError = (error: Error): void => {
            // If download is to be finished, let finsih process handle the rest of work. 
            if (this.finished) return
            Log.errorLog(error)
            this.postPartialRange(range)
            this.rangeMap.delete(uuid)
            this.responseStreamMap.delete(uuid)
        } 
        const handleTimeout = (response: http.IncomingMessage): void => {
            if (this.finished) return 
            response.destroy()
            this.postPartialRange(range)
            this.rangeMap.delete(uuid)
            this.responseStreamMap.delete(uuid)
        }
        const handleResponseStream = (stream: stream.Readable, range: Array<number>): void => {
            this.responseStreamMap.set(uuid, stream)
            stream.on(StreamEvent.Data, (chunk: any) => {
                if (this.finished) return
                const written: number = fs.writeSync(this.fd, chunk, 0, chunk.length, range[0])
                if (written !== chunk.length) {
                    // Let error handler handle it altogether
                    // Emiting 'error' event alone wouldn't stop data event handling
                    stream.emit(StreamEvent.Error, new Error(`Written bytes' number and chunk's length is not equal in task ${this.task.name}'s downloading procedure.`))
                    stream.destroy() 
                }
                this.task.progress += written
                range[0] += written
            })
            stream.on(StreamEvent.Error, (error: Error) => {
                handleError(error)
            })
            stream.on(StreamEvent.End, () => {
                handleEnd()
            })
        }

        const range: Array<number> = this.rangeMap.get(uuid) as Array<number>
        const requestOptions = await generateRequestOption(this.task.downloadUrl, getDownloadHeaders)
        ;(requestOptions.headers as http.OutgoingHttpHeaders)[Header.Range] = `bytes=${range[0]}-${range[1]}`
        const [error, [request, response]]: [Error | undefined, [http.ClientRequest, http.IncomingMessage]] = 
            await handlePromise<[http.ClientRequest, http.IncomingMessage]>(httpRequest(requestOptions))
        if (error) { // 'connect ETIMEDOUT' error while being finishing or after being finished.
            handleError(error)
        }
        const encoding: string = response.headers[Header.ContentEncoding] as string
        if (encoding) {
            try {
                const unzip: stream.Transform = getDecodingStream(encoding)
                response.pipe(unzip)
                handleResponseStream(unzip, range)
            } catch (error: any) {
                handleResponseStream(response, range)
            }
        } else {
            handleResponseStream(response, range)
        }
        request.on(StreamEvent.Error, (error: Error) => {
            handleError(error)
        })
        response.setTimeout(1000, () => {
            handleTimeout(response)
        })
    }

    clearResource(): void {
        super.clearResource()
        clearInterval(this.downloadTimer)
        this.rangeMap.clear()
        this.responseStreamMap.clear()
    }

    finish = (): void => {
        this.finished = true
        for (const [_uuid, stream] of this.responseStreamMap) {
            stream.destroy() // Calling this will cause remaining data in the response to be dropped and the socket to be destroyed.
        } 
        for (const [_uuid, range] of this.rangeMap) {
            this.postPartialRange(range)
        }
        this.clearResource()
    }
}

export { RangeDownloader }