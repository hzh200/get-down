import { Model, DataTypes, ModelAttributes } from 'sequelize'
import { TaskStatus } from './task'

const taskType: ModelAttributes = {
    taskNo: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    subType: {
        type: DataTypes.STRING,
        allowNull: false
    },
    charset: {
        type: DataTypes.STRING,
        allowNull: true
    },
    size: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    location: {
        type: DataTypes.STRING,
        allowNull: false
    },
    url: {
        type: DataTypes.STRING,
        allowNull: false
    },
    downloadUrl: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isRange: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    downloadRanges: {
        type: DataTypes.JSON,
        allowNull: true,
        // get(): Array<Array<number>> {
        //     const downloadRangeString: string = this.getDataValue('downloadRanges')
        //     if (!downloadRangeString) {
        //         return []
        //     }
        //     try {
        //         return JSON.parse(downloadRangeString)
        //     } catch (error: any) {
        //         return []
        //     } 
        // },
        // set(ranges: Array<Array<number>>): Array<Array<number>> {
        //     this.setDataValue('downloadRanges', JSON.stringify(ranges))
        //     return ranges
        // }
    },
    progress: {
        type: DataTypes.NUMBER,
        allowNull: false
    },
    parserNo: {
        type: DataTypes.NUMBER,
        allowNull: false
    },
    parent: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}

const taskSetType = {
    taskNo: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    size: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    url: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false
    },
    progress: {
        type: DataTypes.NUMBER,
        allowNull: false
    },
    parserNo: {
        type: DataTypes.NUMBER,
        allowNull: false
    },
    children: {
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
    declare createAt: string
    declare updateAt: string
    declare downloadUrl: string
    declare subType: string
    declare charset: string | null
    declare location: string
    declare isRange: boolean
    declare downloadRanges: Array<Array<number>> | null
    declare parent: number | null
}

class TaskSetModel extends Model {

}

export { taskType, taskSetType, TaskModel, TaskSetModel }