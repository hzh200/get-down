import { Transaction, Op } from 'sequelize'
import { Task, TaskSet, TaskItem, TaskStatus, Sequence, TaskType } from '../../share/models'
import { taskType, taskSetType, sequenceType, TaskModel, TaskSetModel, SequenceModel, ModelField } from './model_types'
import { handlePromise } from '../../share/utils' 
import { sequelize } from './init'
import { createSequenceModel, deleteSequenceModel, getSequenceModel, deleteSequenceModels, getAllSequenceModels } from './sequence_persistence'

const createTaskModel = async (taskInfo: Task): Promise<TaskModel> => {
    const trans: Transaction = await sequelize.transaction()
    const [taskError, task]: [Error | undefined, TaskModel] = await handlePromise<TaskModel>(TaskModel.create({
        ...taskInfo
    }, { transaction: trans }))
    if (taskError) {
        await trans.rollback()
        throw taskError
    }
    const sequenceInfo = new Sequence()
    sequenceInfo.taskNo = task.taskNo
    sequenceInfo.taskType = TaskType.Task
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
    return task
}

const getAllTaskModels = async (): Promise<Array<TaskModel>> => {
    const [error, tasks]: [Error | undefined, Array<TaskModel>] = await handlePromise<Array<TaskModel>>(TaskModel.findAll())
    if (error) {
        throw error
    }
    return tasks
}

const updateTaskModel = async (task: TaskModel): Promise<void> => {
    task.changed(`${ModelField.status}`, true)
    task.changed(`${ModelField.progress}`, true)
    task.changed(`${ModelField.downloadRanges}`, true)
    await task.save()
}

// Internal method.
const updateTaskModelPart = async (task: TaskModel, taskPart: any, partName: ModelField): Promise<void> => {
    await task.update({ [partName]: taskPart })
}

const updateTaskModelStatus = async (task: TaskModel): Promise<void> => {
    task.changed(`${ModelField.status}`, true)
    await updateTaskModelPart(task, task.status, ModelField.status)
}

const updateTaskModelParent = async (task: TaskModel): Promise<void> => {
    task.changed(`${ModelField.parent}`, true)
    await updateTaskModelPart(task, task.parent, ModelField.parent)
}

const deleteTaskModel = async (taskNo: number): Promise<void> => {
    const trans: Transaction = await sequelize.transaction()
    try {
        // await task.destroy({ transaction: trans })
        // const sequence: SequenceModel = await getSequenceModel(task.taskNo, TaskType.Task, trans)
        // await deleteSequenceModel(sequence, trans)
        const deleted: number = await TaskModel.destroy({
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
        await deleteSequenceModel(taskNo, TaskType.Task, trans)
        await trans.commit()
    } catch (error: any) {
        await trans.rollback()
        throw error
    }
}

const deleteTaskModels = async (taskNos: Array<number>): Promise<void> => {
    const trans: Transaction = await sequelize.transaction()
    try {
        const deleted: number = await TaskModel.destroy({
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
        await deleteSequenceModels(taskNos, TaskType.Task, trans)
        await trans.commit()
    } catch (error: any) {
        await trans.rollback()
        throw error
    }
}

export {
    createTaskModel,
    getAllTaskModels,
    updateTaskModel,
    updateTaskModelStatus,
    updateTaskModelParent,
    deleteTaskModel,
    deleteTaskModels
}