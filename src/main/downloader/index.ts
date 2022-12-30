import { taskQueue } from '../queue'
import { TaskModel } from '../persistence'

import { Downloader } from './downloader'
import { RangeDownloader } from './range_downloader'
import { DirectDownloader } from './direct_downloader'

const getDownloader = (taskNo: number): Downloader => {
    const task = taskQueue.getTaskItem(taskNo)
    if (task.isRange) {
        return new RangeDownloader(taskNo)
    } else {
        return new DirectDownloader(taskNo)
    }
}

export { getDownloader, Downloader }