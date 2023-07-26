import { TaskType } from './constants';

class Sequence {
    sequenceNo: number;
    taskNo: number;
    taskType: TaskType;
    createdAt: string; // timestamp added automatically by Sequelize.
    updatedAt: string; // timestamp added automatically by Sequelize.
}

export { Sequence };