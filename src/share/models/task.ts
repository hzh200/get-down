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
    declare createAt: string // timestamp added automatically by Sequelize
    declare updateAt: string // timestamp added automatically by Sequelize

    downloadUrl: string
    subType: string
    charset: string | undefined
    location: string
    isRange: boolean
    downloadRanges: Array<Array<number>> | undefined
    parent: number | undefined // parent TaskSet
}

export { Task }