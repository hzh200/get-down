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
    parserNo: number
    createdAt: string // timestamp added automatically by Sequelize.
    updatedAt: string // timestamp added automatically by Sequelize.

    taskType: TaskType // Differ from database fields.
}

export { TaskItem }