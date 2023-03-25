import { Transaction, Op } from 'sequelize'
import { Task, TaskSet, TaskItem, TaskStatus, Sequence, TaskType } from '../../share/models'
import { taskType, taskSetType, sequenceType, TaskModel, TaskSetModel, SequenceModel, ModelField } from '../persistence/model_type'
import { handlePromise } from '../../share/utils' 
import { sequelize } from './init'
import { createSequenceModel, deleteSequenceModel, getSequenceModel, deleteSequenceModels, getAllSequenceModels } from './sequence_persistence'

const createTaskSetModel = async (taskSetInfo: TaskSet): Promise<TaskSetModel> => {
    const trans: Transaction = await sequelize.transaction()
    const [taskSetError, taskSet]: [Error | undefined, TaskSetModel] = await handlePromise<TaskSetModel>(TaskSetModel.create({
        ...taskSetInfo
    }, { transaction: trans }))
    if (taskSetError) {
        await trans.rollback()
        throw taskSetError
    }
    const sequenceInfo = new Sequence()
    sequenceInfo.taskNo = taskSet.taskNo
    sequenceInfo.taskType = TaskType.TaskSet
    const [sequenceError, _]: [Error | undefined, SequenceModel] = await handlePromise<SequenceModel>(
        createSequenceModel(sequenceInfo, trans))
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
    return taskSet
}

const getAllTaskSetModels = async (): Promise<Array<TaskSetModel>> => {
    const [error, tasks]: [Error | undefined, Array<TaskSetModel>] = await handlePromise<Array<TaskSetModel>>(TaskSetModel.findAll())
    if (error) {
        throw error
    }
    return tasks
}

const updateTaskSetModel = async (taskSet: TaskSetModel): Promise<void> => {
    taskSet.changed(`${ModelField.status}`, true)
    taskSet.changed(`${ModelField.progress}`, true)
    await taskSet.save()
}

// Internal method.
const updateTaskSetModelPart = async (taskSet: TaskSetModel, taskPart: any, partName: ModelField): Promise<void> => {
    await taskSet.update({ [partName]: taskPart })
}

const updateTaskSetModelStatus = async (taskSet: TaskSetModel): Promise<void> => {
    taskSet.changed(`${ModelField.status}`, true)
    await updateTaskSetModelPart(taskSet, taskSet.status, ModelField.status)
}

const updateTaskSetModelChildren = async (taskSet: TaskSetModel): Promise<void> => {
    taskSet.changed(`${ModelField.children}`, true)
    await updateTaskSetModelPart(taskSet, taskSet.children, ModelField.parent)
}

const deleteTaskSetModel = async (taskNo: number): Promise<void> => {
    const trans: Transaction = await sequelize.transaction()
    try {
        // await taskSet.destroy({ transaction: trans })
        // const sequence: SequenceModel = await getSequenceModel(taskSet.taskNo, TaskType.TaskSet, trans)
        // await deleteSequenceModel(sequence, trans)
        const deleted: number = await TaskSetModel.destroy({
            where: {
                taskNo: {
                    [Op.eq]: taskNo
                }
            },
            transaction: trans
        })
        if (deleted !== 1) {
            throw new Error(`given tasks count: 1, deleted tasks count: ${deleted}`)
        }
        await deleteSequenceModel(taskNo, TaskType.TaskSet, trans)
        await trans.commit()
    } catch (error: any) {
        await trans.rollback()
        throw error
    }
}

const deleteTaskSetModels = async (taskNos: Array<number>): Promise<void> => {
    const trans: Transaction = await sequelize.transaction()
    try {
        const deleted: number = await TaskSetModel.destroy({
            where: {
                taskNo: {
                    [Op.in]: taskNos
                }
            },
            transaction: trans
        })
        if (taskNos.length !== deleted) {
            throw new Error(`given tasks count: ${taskNos.length}, deleted tasks count: ${deleted}`)
        }
        await deleteSequenceModels(taskNos, TaskType.TaskSet, trans)
        await trans.commit()
    } catch (error: any) {
        await trans.rollback()
        throw error
    }
}

export {
    createTaskSetModel,
    getAllTaskSetModels,
    updateTaskSetModel,
    updateTaskSetModelStatus,
    updateTaskSetModelChildren,
    deleteTaskSetModel,
    deleteTaskSetModels
}