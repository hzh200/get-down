class TaskItem {
    taskNo: number
    name: string
    size: number | undefined
    type: string
    url: string
    status: TaskStatus
    progress: number
    createdAt: string // timestamp added automatically by Sequelize
    updatedAt: string // timestamp added automatically by Sequelize
}

enum TaskStatus {
    waiting = 'waiting',
    downloading = 'downloading',
    paused = 'paused',
    done = 'done',
    failed = 'failed'
}

export { TaskItem, TaskStatus }