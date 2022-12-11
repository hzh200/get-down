import { TaskItem } from './task_item'

class Task extends TaskItem {
    declare taskNo: number
    declare name: string
    declare size: number
    declare type: string
    declare url: string
    declare status: TaskStatus
    declare progress: number
    declare parserNo: number
    declare createAt: string // timestamp added automatically by Sequelize
    declare updateAt: string // timestamp added automatically by Sequelize

    downloadUrl: string
    subType: string
    charset: string
    location: string
    isRange: boolean
    downloadRanges: Array<Array<number>>
    useProxy: boolean
    parent: number // parent TaskSet
}

enum TaskStatus {
    waiting = 'waiting',
    downloading = 'downloading',
    paused = 'paused',
    done = 'done',
    failed = 'failed'
}

export {
    Task, 
    TaskStatus
}