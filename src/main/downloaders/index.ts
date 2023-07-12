import taskQueue from '../queue'
import { DownloadType } from '../../share/global/models'
import { Downloader, DownloaderEvent } from './downloader'
import { RangeDownloader } from './range_downloader'
import { DirectDownloader } from './direct_downloader'
import { TaskModel } from '../persistence/model_types'

const getDownloader = (taskNo: number): Downloader => {
    const task: TaskModel = taskQueue.getTask(taskNo) as TaskModel
    if (task.downloadType === DownloadType.Range) {
        return new RangeDownloader(taskNo)
    } else {
        return new DirectDownloader(taskNo)
    }
}

export { getDownloader, Downloader, DirectDownloader, RangeDownloader, DownloaderEvent }