import { Model, DataTypes, ModelAttributes } from 'sequelize'
import { TaskType, TaskStatus, DownloadType } from '../../share/models'

enum ModelField {
    // TaskItem
    taskNo = 'taskNo',
    name = 'name',
    size = 'size',
    type = 'type',
    url = 'url',
    status = 'status',
    progress = 'progress',
    location = 'location',
    parserNo = 'parserNo',
    createdAt = 'createdAt',
    updatedAt = 'updatedAt',
    // Task
    downloadUrl = 'downloadUrl',
    subType = 'subType',
    charset = 'charset',
    downloadType = 'downloadType',
    downloadRanges = 'downloadRanges',
    parent = 'parent',
    // TaskSet
    children = 'children',
    // Sequence
    sequenceNo = 'sequenceNo',
    taskType = 'taskType'
}

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
    [ModelField.type]: {
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
    [ModelField.size]: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    [ModelField.location]: {
        type: DataTypes.STRING,
        allowNull: false
    },
    [ModelField.url]: {
        type: DataTypes.STRING,
        allowNull: false
    },
    [ModelField.downloadUrl]: {
        type: DataTypes.STRING,
        allowNull: false
    },
    [ModelField.status]: {
        type: DataTypes.STRING,
        allowNull: false
    },
    [ModelField.downloadType]: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    [ModelField.downloadRanges]: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    [ModelField.progress]: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    [ModelField.parserNo]: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    [ModelField.parent]: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}

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
    [ModelField.parserNo]: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    [ModelField.children]: {
        type: DataTypes.JSON,
        allowNull: false
    }
}

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

class SequenceModel extends Model {
    declare sequenceNo: number
    declare taskNo: number
    declare taskType: TaskType
    declare createdAt: string
    declare updatedAt: string
}

export { taskType, taskSetType, sequenceType, TaskModel, TaskSetModel, SequenceModel, ModelField }