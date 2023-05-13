import { TaskType, TaskStatus, DownloadType } from './constants'
import { TaskItem } from './task_item'

class Task extends TaskItem {
    declare taskNo: number
    declare name: string
    declare size: number | undefined
    declare type: string
    declare url: string
    declare status: TaskStatus
    declare progress: number
    declare location: string
    declare parserNo: number
    declare createdAt: string
    declare updatedAt: string
    declare taskType: TaskType

    downloadUrl: string
    publishedTimestamp: string
    subType: string
    charset: string | undefined
    downloadType: DownloadType
    downloadRanges: Array<Array<number>> | undefined
    parent: number | undefined // parent TaskSet
}

export { Task }