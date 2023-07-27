import * as fs from 'node:fs';
import * as http from 'node:http';
import * as stream from 'node:stream';
import { handlePromise } from '../../share/utils';
import { Log } from '../../share/utils';
import { Downloader } from './downloader';
import { httpRequest, getDecodingStream } from '../../share/http/functions/request';
import { Header, StreamEvent, ResponseStatusCode } from '../../share/http/constants';
import { TaskModel } from '../persistence/model_types';
import { DownloaderEvent } from './downloader';
const { v4: uuidv4 } = require('uuid');

const RangeLimit: number = 20;

class RangeDownloader extends Downloader {
    declare taskNo: number;
    declare task: TaskModel;
    declare fd: number;
    declare filePath: string;
    rangeMap: Map<string, Array<number>> = new Map<string, Array<number>>();
    responseStreamMap: Map<string, stream.Readable> = new Map<string, stream.Readable>();
    downloadTimer: NodeJS.Timer;
    destroyed: boolean = false;

    constructor(taskNo: number) {
        super(taskNo);
    }

    async download(): Promise<void> {
        await super.download();
        this.downloadTimer = setInterval(() => {
            if (this.destroyed) return;
            if ((this.task.downloadRanges as Array<Array<number>>).length === 0 && this.rangeMap.size === 0 && this.task.progress >= (this.task.size as number)) {
                this.done();
            }
            for (let i = 0; this.isRangeLeft() && i < (RangeLimit - this.rangeMap.size); i++) {
                const range: Array<number> = this.getPartialRange();
                const uuid: string = uuidv4();
                this.rangeMap.set(uuid, range);
                this.downloadRange(uuid).catch((error: Error) => {
                    if (this.destroyed) {
                        return;
                    }
                    Log.error(error);
                });
            }
        }, 500);
    }

    /* 
    *   Task range manuvour functions
    */
    isRangeLeft = (): boolean => {
        const ranges: Array<Array<number>> = this.task.downloadRanges as Array<Array<number>>;
        if (!ranges) {
            return false;
        }
        // No range is left to be allocated.
        if (ranges.length === 0) {
            return false;
        }
        return true;
    };
    getPartialRange = (): Array<number> => {
        const _1MB: number = 1024 * 1024;
        const _10Percent: number = Math.floor(((this.task.size as number) - this.task.progress) / 10);
        const RangeLength: number = _1MB > _10Percent ? _1MB : _10Percent;

        const ranges: Array<Array<number>> = this.task.downloadRanges as Array<Array<number>>;
        if (ranges[0][1] - ranges[0][0] <= RangeLength) {
            return ranges.splice(0, 1)[0];
        } else {
            const left = ranges[0][0];
            ranges[0][0] += RangeLength;
            return [left, ranges[0][0] - 1];
        }
    };
    postPartialRange = (range: Array<number>): void => {
        if (range[0] > range[1]) return;
        const ranges: Array<Array<number>> = this.task.downloadRanges as Array<Array<number>>;
        ranges.splice(0, 0, range);
    };

    // Main downlaod procedure.
    downloadRange = async (uuid: string): Promise<void> => {
        const range: Array<number> = this.rangeMap.get(uuid) as Array<number>;
        const requestOptions: http.RequestOptions = await this.generateDownloadOption();
        (requestOptions.headers as http.OutgoingHttpHeaders)[Header.Range] = `bytes=${range[0]}-${range[1]}`;
        const [error, [request, response]] = await handlePromise<[http.ClientRequest, http.IncomingMessage]>(httpRequest(requestOptions));

        const handleEnd = (): void => {
            if (this.destroyed) return;
            if (range[0] !== range[1] + 1) {
                Log.error('range not fit:' + range + ' ' + response.statusCode + ' ' + JSON.stringify(response.headers));
                this.postPartialRange(range);
            }
            this.rangeMap.delete(uuid);
            this.responseStreamMap.delete(uuid);
        };
        const handleError = (error: Error): void => {
            // If download is to be destroyed, let finsih procedure handle the rest of the work. 
            if (this.destroyed) return;
            Log.error(error);
            this.postPartialRange(range);
            this.rangeMap.delete(uuid);
            this.responseStreamMap.delete(uuid);
        };
        const handleTimeout = (response: http.IncomingMessage): void => {
            if (this.destroyed) return;
            response.destroy();
            this.postPartialRange(range);
            this.rangeMap.delete(uuid);
            this.responseStreamMap.delete(uuid);
        };
        const handleResponseStream = (stream: stream.Readable, range: Array<number>): void => {
            this.responseStreamMap.set(uuid, stream);
            stream.on(StreamEvent.Data, (chunk: any) => {
                if (this.destroyed) return;
                const written: number = fs.writeSync(this.fd, chunk, 0, chunk.length, range[0]);
                if (written !== chunk.length) {
                    // Let error handler handle it altogether
                    // Emiting 'error' event alone wouldn't stop data event handling
                    stream.emit(StreamEvent.Error, new Error(`Written bytes' number and chunk's length is not equal in task ${this.task.name}'s downloading procedure.`));
                    stream.destroy();
                }
                this.task.progress += written;
                range[0] += written;
            });
            stream.on(StreamEvent.Error, (error: Error) => handleError(error));
            stream.on(StreamEvent.End, () => handleEnd());
        };

        if (error) { // 'connect ETIMEDOUT' error while being finishing or after being destroyed.
            handleError(error);
            return;
        }
        if (response.statusCode !== ResponseStatusCode.PartialContent) { // 302, 403
            this.reparse();
        }
        const encoding: string = response.headers[Header.ContentEncoding] as string;
        if (encoding) {
            try {
                const unzip: stream.Transform = getDecodingStream(encoding);
                response.pipe(unzip);
                handleResponseStream(unzip, range);
            } catch (error: any) {
                handleResponseStream(response, range);
            }
        } else {
            handleResponseStream(response, range);
        }
        request.on(StreamEvent.Error, (error: Error) => handleError(error));
        response.setTimeout(1000, () => handleTimeout(response));
    };

    // Entrance for Scheduler to pause and delete the downloader, for Range Downloader only.
    destroy = (): void => {
        this.destroyed = true;
        for (const [_uuid, stream] of this.responseStreamMap) {
            stream.destroy(); // Calling this will cause remaining data in the response to be dropped and the socket to be destroyed.
        }
        for (const [_uuid, range] of this.rangeMap) {
            this.postPartialRange(range);
        }
        this.clear();
    };

    reparse = () => this.emit(DownloaderEvent.Reparse);

    // Override from Downloader.
    clear(): void {
        super.clear();
        clearInterval(this.downloadTimer);
        this.rangeMap.clear();
        this.responseStreamMap.clear();
    }

    // Inherit from Downloader.
    declare generateDownloadOption: () => Promise<http.RequestOptions>;
    declare done: () => void;
    declare fail: () => void;
}

export { RangeDownloader };