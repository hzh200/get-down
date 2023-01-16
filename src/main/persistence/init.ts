import { Model, Sequelize } from 'sequelize'
import { taskType, taskSetType, sequenceType, TaskModel, TaskSetModel, SequenceModel, ModelField } from './model_type'
import { DBPath } from '../../../configs/path'
import { handlePromise } from '../../share/utils' 

// Must be named by sequelize, because of Model.init function behavior.
const sequelize: Sequelize = new Sequelize({ 
    dialect: 'sqlite',
    storage: DBPath,
    logging: false
})

const initPersistence = async (): Promise<void> => {
    try {
        TaskModel.init(taskType, {
            sequelize,
            tableName: 'tasks', 
            underscored: true
        })
        TaskSetModel.init(taskSetType, {
            sequelize,
            tableName: 'task_sets', 
            underscored: true
        })
        SequenceModel.init(sequenceType, {
            sequelize,
            tableName: 'sequence',
            underscored: true
        })
        await sequelize.sync(/*{ force: true }*/)
    } catch (error: any) {
        throw error
    }
}

export { sequelize, initPersistence }