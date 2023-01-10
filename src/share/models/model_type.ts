import { Model, DataTypes, ModelAttributes } from 'sequelize'
import { TaskStatus } from './task_item'
import { DownloadType } from './task'

enum TaskField {
    // TaskItem
    taskNo = 'taskNo',
    name = 'name',
    size = 'size',
    type = 'type',
    url = 'url',
    status = 'status',
    progress = 'progress',
    parserNo = 'parserNo',
    createdAt = 'createdAt',
    updatedAt = 'updatedAt',
    // Task
    downloadUrl = 'downloadUrl',
    subType = 'subType',
    charset = 'charset',
    location = 'location',
    downloadType = 'downloadType',
    downloadRanges = 'downloadRanges',
    parent = 'parent',
    // TaskSet
    children = 'children'
}

const taskType: ModelAttributes = {
    [TaskField.taskNo]: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    [TaskField.name]: {
        type: DataTypes.STRING,
        allowNull: false
    },
    [TaskField.type]: {
        type: DataTypes.STRING,
        allowNull: false
    },
    [TaskField.subType]: {
        type: DataTypes.STRING,
        allowNull: false
    },
    [TaskField.charset]: {
        type: DataTypes.STRING,
        allowNull: true
    },
    [TaskField.size]: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    [TaskField.location]: {
        type: DataTypes.STRING,
        allowNull: false
    },
    [TaskField.url]: {
        type: DataTypes.STRING,
        allowNull: false
    },
    [TaskField.downloadUrl]: {
        type: DataTypes.STRING,
        allowNull: false
    },
    [TaskField.status]: {
        type: DataTypes.STRING,
        allowNull: false
    },
    [TaskField.downloadType]: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    [TaskField.downloadRanges]: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    [TaskField.progress]: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    [TaskField.parserNo]: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    [TaskField.parent]: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}

const taskSetType = {
    [TaskField.taskNo]: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    [TaskField.name]: {
        type: DataTypes.STRING,
        allowNull: false
    },
    [TaskField.size]: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    [TaskField.url]: {
        type: DataTypes.STRING,
        allowNull: false
    },
    [TaskField.status]: {
        type: DataTypes.STRING,
        allowNull: false
    },
    [TaskField.progress]: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    [TaskField.parserNo]: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    [TaskField.children]: {
        type: DataTypes.STRING,
        allowNull: false
    }
}

class TaskModel extends Model {
    declare taskNo: number
    declare name: string
    declare size: number
    declare type: string
    declare url: string
    declare status: TaskStatus
    declare progress: number
    declare parserNo: number
    declare createdAt: string
    declare updatedAt: string
    declare downloadUrl: string
    declare subType: string
    declare charset: string | undefined
    declare location: string
    declare downloadType: DownloadType
    declare downloadRanges: Array<Array<number>> | Array<null> | undefined
    declare parent: number | undefined
}

class TaskSetModel extends Model {
    declare taskNo: number
    declare name: string
    declare size: number
    declare type: string
    declare url: string
    declare status: TaskStatus
    declare progress: number
    declare parserNo: number
    declare createdAt: string
    declare updatedAt: string
    declare children: Array<number>
}

export { taskType, taskSetType, TaskModel, TaskSetModel, TaskField }