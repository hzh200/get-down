import { TaskItem, TaskStatus } from './task_item'

class Task extends TaskItem {
    declare taskNo: number
    declare name: string
    declare size: number | undefined
    declare type: string
    declare url: string
    declare status: TaskStatus
    declare progress: number
    declare parserNo: number
    declare createdAt: string // timestamp added automatically by Sequelize
    declare updatedAt: string // timestamp added automatically by Sequelize

    downloadUrl: string
    subType: string
    charset: string | undefined
    location: string
    downloadType: DownloadType
    downloadRanges: Array<Array<number>> | undefined
    parent: number | undefined // parent TaskSet
}

enum DownloadType {
    Direct,
    Range,
    Blob, // m3u8
}

export { Task, DownloadType }