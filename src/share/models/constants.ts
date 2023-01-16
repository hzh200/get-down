enum TaskType {
    Task = 'Task',
    TaskSet = 'TaskSet'
}

enum TaskStatus {
    Waiting = 'Waiting',
    Downloading = 'Downloading',
    Paused = 'Paused',
    Done = 'Done',
    Failed = 'Failed'
}

enum DownloadType {
    Direct,
    Range,
    Blob, // m3u8
}

export { TaskType, TaskStatus, DownloadType }