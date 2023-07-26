import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as EventEmitter from 'events';
import taskQueue from '../queue';
import { Log } from '../../share/utils';
import { changeFileTimestamp } from '../../share/utils/main';
import callbackModules, { Callback } from '../../share/extractors/callbacks';
import { TaskModel } from '../persistence/model_types';
import { generateRequestOption, getDownloadHeaders } from '../../share/http/options';

enum DownloaderEvent {
    Done = 'Done',
    Fail = 'Fail',
    Reparse = 'Reparse' // For range downloader only. 
}

class Downloader extends EventEmitter {
    taskNo: number;
    task: TaskModel;
    fd: number;
    filePath: string;

    constructor(taskNo: number) {
        super();
        this.taskNo = taskNo;
        this.task = taskQueue.getTask(taskNo) as TaskModel;
        this.filePath = path.join(this.task.location, this.task.name);
    }

    // Entrance of download procedure for Scheduler
    async download(): Promise<void> {
        const parentPath: string = path.dirname(this.filePath);
        if (!fs.existsSync(parentPath)) {
            fs.mkdirSync(parentPath, { recursive: true });
        }
        if (!fs.existsSync(this.filePath)) {
            this.fd = fs.openSync(this.filePath, 'w');
        } else {
            this.fd = fs.openSync(this.filePath, 'r+');
        }
    }

    // Generate download option based on parser headers.
    async generateDownloadOption(): Promise<http.RequestOptions> {
        const callback: Callback = callbackModules.getCallback(this.task.extractorNo);
        let requestHeaders: http.OutgoingHttpHeaders = {};
        if (callback.requestHeaders) {
            requestHeaders = {
                ...requestHeaders,
                ...callback.requestHeaders
            };
        }
        if (this.task.additionalInfo) {
            const additionalInfo = JSON.parse(this.task.additionalInfo);
            if (additionalInfo['customHeaders']) {
                requestHeaders = {
                    ...requestHeaders,
                    ...additionalInfo['customHeaders']
                };
            }
        }
        return await generateRequestOption(this.task.downloadUrl, getDownloadHeaders, requestHeaders);
    }

    // Clear Download instance resource.
    clear(): void {
        fs.closeSync(this.fd);
        changeFileTimestamp(this.filePath, this.task.publishedTimestamp);
        const parentPath: string = path.dirname(this.filePath);
        changeFileTimestamp(parentPath, this.task.publishedTimestamp);
    }

    // Task downloads succeed.
    // Clear the download resource and notice the Schedular.
    done = (): void => {
        this.clear();
        this.emit(DownloaderEvent.Done);
        Log.info(`Task ${this.task.name} downloads succeed.`);
    };

    // Task downloads failed.
    // Clear the download resource and notice the Schedular.
    fail = (): void => {
        this.clear();
        this.emit(DownloaderEvent.Fail);
        Log.info(`Task ${this.task.name} downloads failed, taskNo ${this.taskNo}.`);
    };
}

export { Downloader, DownloaderEvent };