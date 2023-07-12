import { TaskType, TaskStatus } from './constants'

class TaskItem {
    taskNo: number
    name: string
    size: number | undefined
    type: string
    url: string
    status: TaskStatus
    progress: number
    location: string
    extractorNo: number
    createdAt: string // timestamp added automatically by Sequelize.
    updatedAt: string // timestamp added automatically by Sequelize.

    taskType: TaskType // Not exist in table fields, only for type checking.
}

export { TaskItem }