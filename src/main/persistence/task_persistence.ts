import { Transaction } from 'sequelize'
import { Task, TaskSet, TaskItem, TaskStatus, Sequence, TaskType } from '../../share/models'
import { taskType, taskSetType, sequenceType, TaskModel, TaskSetModel, SequenceModel, ModelField } from '../persistence/model_type'
import { handlePromise } from '../../share/utils' 
import { sequelize } from './init'
import { createSequenceModel, deleteSequenceModel, getSequenceModel, getAllSequenceModels } from './sequence_persistence'

const createTaskModel = async (taskInfo: Task): Promise<TaskModel> => {
    const trans: Transaction = await sequelize.transaction()
    const [taskError, task]: [Error | undefined, TaskModel] = await handlePromise<TaskModel>(TaskModel.create({
        ...taskInfo
    }, { transaction: trans }))
    if (taskError) {
        trans.rollback()
        throw taskError
    }
    const sequenceInfo = new Sequence()
    sequenceInfo.taskNo = task.taskNo
    sequenceInfo.taskType = TaskType.Task
    const [sequenceError, _]: [Error | undefined, SequenceModel] = await handlePromise<SequenceModel>(
        createSequenceModel(sequenceInfo, trans))
    if (sequenceError) {
        trans.rollback()
        throw sequenceError
    } 
    try {
        await trans.commit()
    } catch (error: any) {
        trans.rollback()
        throw error
    }
    return task
}

const updateTaskModel = async (task: TaskModel): Promise<void> => {
    task.changed(`${ModelField.status}`, true)
    task.changed(`${ModelField.progress}`, true)
    task.changed(`${ModelField.downloadRanges}`, true)
    const [error, _]: [Error | undefined, TaskModel] = await handlePromise<TaskModel>(task.save())
    if (error) {
        throw error
    }
}

const updateTaskModelPart = async (task: TaskModel, taskPart: any, partName: ModelField): Promise<void> => {
    const [error, _]: [Error | undefined, TaskModel] = await handlePromise<TaskModel>(task.update({ [partName]: taskPart }))
    if (error) {
        throw error
    }
}

const updateTaskModelStatus = async (task: TaskModel): Promise<void> => {
    task.changed(`${ModelField.status}`, true)
    const [error, _]: [Error | undefined, void] = await handlePromise<void>(updateTaskModelPart(task, task.status, ModelField.status))
    if (error) {
        throw error
    }
}

const updateTaskModelParent = async (task: TaskModel): Promise<void> => {
    task.changed(`${ModelField.parent}`, true)
    const [error, _]: [Error | undefined, void] = await handlePromise<void>(updateTaskModelPart(task, task.parent, ModelField.parent))
    if (error) {
        throw error
    }
}

// const updateTaskProgress = async (task: TaskModel, taskProgress: number): Promise<void> => {
//     task.changed(`${ModelField.progress}`, true)
//     const [error, _]: [Error | undefined, void] = await handlePromise<void>(updateTaskModelPart(task, taskProgress, ModelField.progress))
//     if (error) {
//         throw error
//     }
// }

// const updateTaskRanges = async (task: TaskModel, taskRanges: Array<Array<number>> | Array<null>): Promise<void> => {
//     task.changed(`${ModelField.downloadRanges}`, true)
//     const [error, _]: [Error | undefined, void] = await handlePromise<void>(updateTaskModelPart(task, taskRanges, ModelField.downloadRanges))
//     if (error) {
//         throw error
//     }
// }

const deleteTaskModel = async (task: TaskModel): Promise<void> => {
    const trans: Transaction = await sequelize.transaction()
    const [taskError]: [Error | undefined, void] = await handlePromise<void>(task.destroy({ transaction: trans }))
    if (taskError) {
        await trans.rollback()
        throw taskError
    }
    let [sequenceError, sequence]: [Error | undefined, SequenceModel] = 
        await handlePromise<SequenceModel>(getSequenceModel(task.taskNo, TaskType.Task, trans))
    if (sequenceError) {
        await trans.rollback()
        throw sequenceError
    }
    ;[sequenceError] = await handlePromise<void>(deleteSequenceModel(sequence, trans))
    if (sequenceError) {
        await trans.rollback()
        throw sequenceError
    } 
    try {
        await trans.commit()
    } catch (error: any) {
        await trans.rollback()
        throw error
    }
}

const getAllTaskModels = async (): Promise<Array<TaskModel>> => {
    const [error, tasks]: [Error | undefined, Array<TaskModel>] = await handlePromise<Array<TaskModel>>(TaskModel.findAll())
    if (error) {
        throw error
    }
    return tasks
}

export {
    createTaskModel,
    updateTaskModel,
    updateTaskModelStatus,
    updateTaskModelParent,
    deleteTaskModel,
    getAllTaskModels,
}