import { Model, DataTypes, ModelAttributes } from 'sequelize';
import { TaskType, TaskStatus, DownloadType } from '../../../share/global/models';
import ModelField from './model_fields';

const taskType: ModelAttributes = {
    [ModelField.taskNo]: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    [ModelField.name]: {
        type: DataTypes.STRING,
        allowNull: false
    },
    [ModelField.size]: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    [ModelField.type]: {
        type: DataTypes.STRING,
        allowNull: false
    },
    [ModelField.url]: {
        type: DataTypes.STRING,
        allowNull: false
    },
    [ModelField.status]: {
        type: DataTypes.STRING,
        allowNull: false
    },
    [ModelField.progress]: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    [ModelField.location]: {
        type: DataTypes.STRING,
        allowNull: false
    },
    [ModelField.extractorNo]: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    [ModelField.downloadUrl]: {
        type: DataTypes.STRING,
        allowNull: false
    },
    [ModelField.publishedTimestamp]: {
        type: DataTypes.STRING,
        allowNull: false
    },
    [ModelField.subType]: {
        type: DataTypes.STRING,
        allowNull: false
    },
    [ModelField.charset]: {
        type: DataTypes.STRING,
        allowNull: true
    },
    [ModelField.downloadType]: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    [ModelField.downloadRanges]: {
        type: DataTypes.JSON,
        allowNull: true
    },
    [ModelField.parent]: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    [ModelField.additionalInfo]: {
        type: DataTypes.STRING,
        allowNull: true
    }
};

class TaskModel extends Model {
    declare taskNo: number;
    declare name: string;
    declare size: number | undefined;
    declare type: string;
    declare url: string;
    declare status: TaskStatus;
    declare progress: number;
    declare location: string;
    declare extractorNo: number;
    declare createdAt: string;
    declare updatedAt: string;
    declare downloadUrl: string;
    declare publishedTimestamp: string;
    declare subType: string;
    declare charset: string | undefined;
    declare downloadType: DownloadType;
    declare downloadRanges: Array<Array<number>> | undefined;
    declare parent: number | undefined;
    declare additionalInfo: string | undefined;
}

export { taskType, TaskModel };