import { Model, DataTypes, ModelAttributes } from 'sequelize'
import { TaskType, TaskStatus, DownloadType } from '../../../share/models'
import ModelField from './model_fields'

const taskSetType: ModelAttributes = {
    [ModelField.taskNo]: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    [ModelField.name]: {
        type: DataTypes.STRING,
        allowNull: false
    },
    [ModelField.size]: {
        type: DataTypes.INTEGER,
        allowNull: true
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
    [ModelField.parserNo]: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    [ModelField.children]: {
        type: DataTypes.JSON,
        allowNull: false
    }
}

class TaskSetModel extends Model {
    declare taskNo: number
    declare name: string
    declare size: number | undefined
    declare type: string
    declare url: string
    declare status: TaskStatus
    declare progress: number
    declare location: string
    declare parserNo: number
    declare createdAt: string
    declare updatedAt: string
    declare children: Array<number>
}

export { taskSetType, TaskSetModel }