import { Transaction } from 'sequelize'
import { Sequence, TaskType } from '../../share/models'
import { taskType, taskSetType, sequenceType, TaskModel, TaskSetModel, SequenceModel, ModelField } from '../persistence/model_type'
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

const deleteSequenceModel = async (sequence: SequenceModel, trans: Transaction): Promise<void> => {
    const [error, _]: [Error | undefined, void] = await handlePromise<void>(sequence.destroy({ transaction: trans }))
    if (error) {
        throw error
    }
}

const getSequenceModel = async (taskNo: number, taskType: TaskType): Promise<SequenceModel> => {
    const [error, sequence]: [Error | undefined, SequenceModel | null] = 
        await handlePromise<SequenceModel | null>(SequenceModel.findOne({ where: { taskNo: taskNo, taskType: taskType } }))
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

export { createSequenceModel, deleteSequenceModel, getSequenceModel, getAllSequenceModels }