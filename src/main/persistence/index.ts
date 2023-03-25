import { initPersistence } from './init'
import { 
    createTaskModel,
    getAllTaskModels,
    updateTaskModel,
    updateTaskModelStatus,
    updateTaskModelParent,
    deleteTaskModel,
    deleteTaskModels
} from './task_persistence'
import { 
    createTaskSetModel,
    getAllTaskSetModels,
    updateTaskSetModel,
    updateTaskSetModelStatus,
    updateTaskSetModelChildren,
    deleteTaskSetModel,
    deleteTaskSetModels
} from './taskset_persistence'
import { getAllSequenceModels } from './sequence_persistence'

import { TaskStatus, TaskType } from '../../share/models'
import { TaskModel, TaskSetModel } from './model_type'

const getSequencedRecords = async (): Promise<Array<TaskModel | TaskSetModel>> => {
    const records: Array<TaskModel | TaskSetModel> = []
    await Promise.all([getAllTaskModels(), getAllTaskSetModels(), getAllSequenceModels()]).then(([tasks, taskSets, sequences]) => {
        for (const sequence of sequences) {
            if (sequence.taskType === TaskType.Task) {
                const task: TaskModel = tasks.shift() as TaskModel
                records.push(task)
            } else { // TaskSet
                const taskSet: TaskSetModel = taskSets.shift() as TaskSetModel
                records.push(taskSet)
            }
        }
    })
    return records
}

const updateTaskStatus = async (task: TaskModel, status: TaskStatus) => {
    task.status = status
    await updateTaskModelStatus(task)
}

const updateTaskSetStatus = async (task: TaskSetModel, status: TaskStatus) => {
    task.status = status
    await updateTaskSetModelStatus(task)
}

export { initPersistence }
export { 
    createTaskModel,
    // getAllTaskModels,
    updateTaskModel,
    // updateTaskModelStatus,
    updateTaskModelParent,
    deleteTaskModel,
    deleteTaskModels
}
export { 
    createTaskSetModel,
    // getAllTaskSetModels,
    updateTaskSetModel,
    // updateTaskSetModelStatus,
    updateTaskSetModelChildren,
    deleteTaskSetModel,
    deleteTaskSetModels
}
// export { getAllSequenceModels }
export { 
    getSequencedRecords,
    updateTaskStatus,
    updateTaskSetStatus
}