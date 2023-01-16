import { TaskType, TaskStatus } from './constants'
import { TaskItem } from './task_item'

class TaskSet extends TaskItem {
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

    children: Array<number> // Task children
}

export { TaskSet }