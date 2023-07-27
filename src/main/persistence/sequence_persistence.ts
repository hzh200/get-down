import { Transaction, Op } from 'sequelize';
import { Sequence, TaskType } from '../../share/global/models';
import { taskType, taskSetType, sequenceType, TaskModel, TaskSetModel, SequenceModel, ModelField } from './model_types';

const createSequenceModel = async (sequence: Sequence, trans: Transaction): Promise<SequenceModel> => {
    return await SequenceModel.create({
        ...sequence
    }, { transaction: trans });
};

const getSequenceModel = async (taskNo: number, taskType: TaskType, trans: Transaction): Promise<SequenceModel> => {
    const sequence = await SequenceModel.findOne({ where: { taskNo: taskNo, taskType: taskType }, transaction: trans });
    if (!sequence) {
        throw new Error('No sequence instance is found.');
    }
    return sequence;
};

const getAllSequenceModels = async (): Promise<Array<SequenceModel>> => {
    return await SequenceModel.findAll();
};

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
    });
    if (deleted !== 1) {
        throw new Error(`given tasks count: 1, deleted tasks count: ${deleted}`);
    }
};

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
    });
    if (taskNos.length !== deleted) {
        throw new Error(`given tasks count: ${taskNos.length}, deleted tasks count: ${deleted}`);
    }
};

export {
    createSequenceModel,
    getSequenceModel,
    getAllSequenceModels,
    deleteSequenceModel,
    deleteSequenceModels
};