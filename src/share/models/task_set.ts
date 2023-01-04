import { TaskItem, TaskStatus } from './task_item'

class TaskSet extends TaskItem {
    declare taskNo: number
    declare name: string
    declare size: number
    declare type: string
    declare url: string
    declare status: TaskStatus
    declare progress: number
    declare parserNo: number
    declare createdAt: string // timestamp added automatically by Sequelize
    declare updatedAt: string // timestamp added automatically by Sequelize

    children: Array<number> // Task children
}

export { TaskSet }