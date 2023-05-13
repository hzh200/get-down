import { Transaction, Op } from 'sequelize'
import { Sequence, TaskType } from '../../share/models'
import { taskType, taskSetType, sequenceType, TaskModel, TaskSetModel, SequenceModel, ModelField } from './model_types'
import { handlePromise } from '../../share/utils' 

const createSequenceModel = async (sequence: Sequence, trans: Transaction): Promise<SequenceModel> => {
    const [error, task]: [Error | undefined, SequenceModel] = await handlePromise<SequenceModel>(SequenceModel.create({
        ...sequence
    }, { transaction: trans }))
    if (error) {
        throw error
    }
    return task
}

const getSequenceModel = async (taskNo: number, taskType: TaskType, trans: Transaction): Promise<SequenceModel> => {
    const [error, sequence]: [Error | undefined, SequenceModel | null] = 
        await handlePromise<SequenceModel | null>(SequenceModel.findOne({ where: { taskNo: taskNo, taskType: taskType }, transaction: trans }))
    if (error) {
        throw error
    }
    if (!sequence) {
        throw new Error('No sequence instance is found.')
    }
    return sequence
}

const getAllSequenceModels = async (): Promise<Array<SequenceModel>> => {
    const [error, sequences]: [Error | undefined, Array<SequenceModel>] = await handlePromise<Array<SequenceModel>>(SequenceModel.findAll())
    if (error) {
        throw error
    }
    return sequences
}

const deleteSequenceModel = async (taskNo: number, taskType: TaskType, trans: Transaction): Promise<void> => {
    const deleted: number = await SequenceModel.destroy({
        where: {
            taskNo: {
                [Op.eq]: taskNo,
            },
            taskType: {
                [Op.eq]: taskType
            }
        },
        transaction: trans
    })
    if (deleted !== 1) {
        throw new Error(`given tasks count: 1, deleted tasks count: ${deleted}`)
    }
}

const deleteSequenceModels = async (taskNos: Array<number>, taskType: TaskType, trans: Transaction): Promise<void> => {
    const deleted: number = await SequenceModel.destroy({
        where: {
            taskNo: {
                [Op.in]: taskNos,
            },
            taskType: {
                [Op.eq]: taskType
            }
        },
        transaction: trans
    })
    if (taskNos.length !== deleted) {
        throw new Error(`given tasks count: ${taskNos.length}, deleted tasks count: ${deleted}`)
    }
}

export { 
    createSequenceModel,
    getSequenceModel, 
    getAllSequenceModels,  
    deleteSequenceModel, 
    deleteSequenceModels
}