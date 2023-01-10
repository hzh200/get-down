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
    Waiting = 'Waiting',
    Downloading = 'Downloading',
    Paused = 'Paused',
    Done = 'Done',
    Failed = 'Failed'
}

export { TaskItem, TaskStatus }