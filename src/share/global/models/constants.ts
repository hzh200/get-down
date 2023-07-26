enum TaskType {
    Task = 'Task',
    TaskSet = 'TaskSet'
}

enum TaskStatus {
    Waiting = 'Waiting',
    Downloading = 'Downloading',
    Paused = 'Paused',
    Done = 'Done',
    Failed = 'Failed',
    Processing = 'Processing'
}

enum DownloadType {
    Direct,
    Range
}

export { TaskType, TaskStatus, DownloadType };