import * as fs from 'node:fs'
import * as http from 'node:http'
import * as stream from 'node:stream'
import * as https from 'node:https'
import { handlePromise } from '../../common/utils'
import { Log } from '../../common/log'
import { parserModule } from '../../common/parsers'
import { Downloader } from "./downloader"
import { httpRequest, getDecodingStream } from '../../common/http/request'
import { generateRequestOption } from '../../common/http/option'
import { getDownloadHeaders } from '../../common/http/header'

const { v4: uuidv4 } = require('uuid')

const rangeLength: number = 1024 * 1024 // 1 MB
const rangeLimit: number = 20

class RangeDownloader extends Downloader {
    rangeMap: Map<string, Array<number>> = new Map<string, Array<number>>()

    constructor(taskNo: number) {
        super(taskNo)
    }

    async download(): Promise<void> {
        await super.download()
        const partialTimer: NodeJS.Timer = setInterval(() => {
            if ((this.task.downloadRanges as Array<Array<number>>).length === 0 && this.rangeMap.size === 0 && this.task.progress >= this.task.size) {
                clearInterval(partialTimer)
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
        const handleResponseStream = (stream: stream.Readable, range: Array<number>): void => {
            stream.on('data', (chunk: any) => {
                const written: number = fs.writeSync(this.fd, chunk, 0, chunk.length, range[0])
                if (written !== chunk.length) {
                    // Let error handler handle it altogether
                    // Emiting 'error' event alone wouldn't stop data event handling
                    stream.emit('error', new Error(`Written bytes' number and chunk's length is not equal in task ${this.task.name}'s downloading procedure.`))
                    stream.destroy() 
                }
                this.task.progress += written
                range[0] += written
            })
            stream.on('error', (error: Error) => {
                handleError(error)
            })
            stream.on('end', () => {
                handleEnd()
            })
        }

        const range: Array<number> = this.rangeMap.get(uuid) as Array<number>
        const requestOptions = await generateRequestOption(this.task.downloadUrl, getDownloadHeaders)
        ;(requestOptions.headers as http.OutgoingHttpHeaders)['Range'] = `bytes=${range[0]}-${range[1]}`
        const [_, [request, response]]: [Error | undefined, [http.ClientRequest, http.IncomingMessage]] = 
            await handlePromise<[http.ClientRequest, http.IncomingMessage]>(httpRequest(requestOptions))
        const encoding = response.headers['content-encoding']
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
        request.on('error', (error: Error) => {
            handleError(error)
        })
        response.setTimeout(1000, () => {
            handleTimeout(response)
        })

        const handleEnd = (): void => {
            this.rangeMap.delete(uuid)
        }
        const handleError = (error: Error): void => {
            Log.errorLog(error)
            this.postPartialRange(range)
            this.rangeMap.delete(uuid)
        } 
        const handleTimeout = (response: http.IncomingMessage): void => {
            response.destroy()
            this.postPartialRange(range)
            this.rangeMap.delete(uuid)
        }
    }

    pause = (): void => {
        
    }

    resume = (): void => {
        
    }

    delete = (): void => {
        
    }
}

export { RangeDownloader }