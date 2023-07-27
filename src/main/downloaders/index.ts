import taskQueue from '../queue';
import { DownloadType } from '../../share/global/models';
import { Downloader, DownloaderEvent } from './downloader';
import { RangeDownloader } from './range_downloader';
import { DirectDownloader } from './direct_downloader';
import { TaskModel } from '../persistence/model_types';

const getDownloader = (taskNo: number): Downloader => {
    const task: TaskModel = taskQueue.getTask(taskNo) as TaskModel;
    if (!task) {
        throw new Error(`task with taskNo ${taskNo} doesn't exist.`);
    }
    return task.downloadType === DownloadType.Range ? new RangeDownloader(taskNo) : new DirectDownloader(taskNo);
};

export { getDownloader, Downloader, DirectDownloader, RangeDownloader, DownloaderEvent };