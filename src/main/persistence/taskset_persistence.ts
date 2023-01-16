import { Transaction } from 'sequelize'
import { Task, TaskSet, TaskItem, TaskStatus, Sequence, TaskType } from '../../share/models'
import { taskType, taskSetType, sequenceType, TaskModel, TaskSetModel, SequenceModel, ModelField } from '../persistence/model_type'
import { handlePromise } from '../../share/utils' 
import { sequelize } from './init'
import { createSequenceModel, deleteSequenceModel, getSequenceModel, getAllSequenceModels } from './sequence_persistence'

const createTaskSetModel = async (taskSetInfo: TaskSet): Promise<TaskSetModel> => {
    const trans: Transaction = await sequelize.transaction()
    const [taskSetError, taskSet]: [Error | undefined, TaskSetModel] = await handlePromise<TaskSetModel>(TaskSetModel.create({
        ...taskSetInfo
    }, { transaction: trans }))
    if (taskSetError) {
        trans.rollback()
        throw taskSetError
    }
    const sequenceInfo = new Sequence()
    sequenceInfo.taskNo = taskSet.taskNo
    sequenceInfo.taskType = TaskType.TaskSet
    const [sequenceError, _]: [Error | undefined, SequenceModel] = await handlePromise<SequenceModel>(
        createSequenceModel(sequenceInfo, trans))
    if (sequenceError) {
        trans.rollback()
        throw sequenceError
    } 
    await trans.commit()
    return taskSet
}

const updateTaskSetModel = async (taskSet: TaskSetModel): Promise<void> => {
    taskSet.changed(`${ModelField.status}`, true)
    taskSet.changed(`${ModelField.progress}`, true)
    const [error, _]: [Error | undefined, TaskSetModel] = await handlePromise<TaskSetModel>(taskSet.save())
    if (error) {
        throw error
    }
}

const updateTaskSetModelPart = async (taskSet: TaskSetModel, taskPart: any, partName: ModelField): Promise<void> => {
    const [error, _]: [Error | undefined, TaskSetModel] = await handlePromise<TaskSetModel>(taskSet.update({ [partName]: taskPart }))
    if (error) {
        throw error
    }
}

const updateTaskSetModelStatus = async (taskSet: TaskSetModel): Promise<void> => {
    taskSet.changed(`${ModelField.status}`, true)
    const [error, _]: [Error | undefined, void] = await handlePromise<void>(updateTaskSetModelPart(taskSet, taskSet.status, ModelField.status))
    if (error) {
        throw error
    }
}

const updateTaskSetModelChildren = async (taskSet: TaskSetModel): Promise<void> => {
    taskSet.changed(`${ModelField.children}`, true)
    const [error, _]: [Error | undefined, void] = await handlePromise<void>(updateTaskSetModelPart(taskSet, taskSet.children, ModelField.parent))
    if (error) {
        throw error
    }
}

const deleteTaskSetModel = async (taskSet: TaskSetModel): Promise<void> => {
    const trans: Transaction = await sequelize.transaction()
    const [taskSetError]: [Error | undefined, void] = await handlePromise<void>(taskSet.destroy({ transaction: trans }))
    if (taskSetError) {
        trans.rollback()
        throw taskSetError
    }
    let [sequenceError, sequence]: [Error | undefined, SequenceModel] = 
        await handlePromise<SequenceModel>(getSequenceModel(taskSet.taskNo, TaskType.TaskSet))
    if (sequenceError) {
        trans.rollback()
        throw sequenceError
    }
    ;[sequenceError] = await handlePromise<void>(deleteSequenceModel(sequence, trans))
    if (sequenceError) {
        trans.rollback()
        throw sequenceError
    } 
}

const getAllTaskSetModels = async (): Promise<Array<TaskSetModel>> => {
    const [error, tasks]: [Error | undefined, Array<TaskSetModel>] = await handlePromise<Array<TaskSetModel>>(TaskSetModel.findAll())
    if (error) {
        throw error
    }
    return tasks
}

export {
    createTaskSetModel,
    updateTaskSetModel,
    updateTaskSetModelStatus,
    updateTaskSetModelChildren,
    deleteTaskSetModel,
    getAllTaskSetModels
}