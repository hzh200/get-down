export class TaskItem {
    taskNo: number
    name: string
    size: number
    type: string
    url: string
    status: string
    progress: number
    createAt: string // timestamp added automatically by Sequelize
    updateAt: string // timestamp added automatically by Sequelize
}