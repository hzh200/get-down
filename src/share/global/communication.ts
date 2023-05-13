enum CommunicateAPIName {
    AddTask = 'add-task',
    AddTaskSet = 'add-task-set',
    ResumeTasks = 'resume-tasks',
    PauseTasks = 'pause-tasks',
    DeleteTasks = 'delete-tasks',
    NewTaskItem = 'new-task-item',
    UpdateTaskItem = 'update-task-item',
    DeleteTaskItem = 'delete-task-item',
    // for communicating inside main process using mainEventEmitter. 
    AddFile = 'add-file'
}

export { CommunicateAPIName }