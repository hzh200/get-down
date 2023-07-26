import { Model, DataTypes, ModelAttributes } from 'sequelize';
import { TaskType, TaskStatus, DownloadType } from '../../../share/global/models';
import ModelField from './model_fields';

const sequenceType: ModelAttributes = {
    [ModelField.sequenceNo]: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    [ModelField.taskNo]: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    [ModelField.taskType]: {
        type: DataTypes.STRING,
        allowNull: false
    },
};

class SequenceModel extends Model {
    declare sequenceNo: number;
    declare taskNo: number;
    declare taskType: TaskType;
    declare createdAt: string;
    declare updatedAt: string;
}

export { sequenceType, SequenceModel };