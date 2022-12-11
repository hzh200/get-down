import { ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import { Model, Sequelize } from 'sequelize'
import { Task, TaskSet, TaskItem, TaskStatus } from '../../common/models'
import { taskType, taskSetType, TaskModel, TaskSetModel } from '../../common/models/model_type'
import { dbPath } from '../../../config/path'
import { handlePromise } from '../../common/utils'

const sequelize: Sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false
})

const initPersistence = async (): Promise<void> => {
    try {
        TaskModel.init(taskType, {
            sequelize,
            tableName: 'tasks', 
            underscored: true
        });
        TaskSetModel.init(taskSetType, {
            sequelize,
            tableName: 'task_sets', 
            underscored: true
        });
        await sequelize.sync(/*{ force: true }*/)
    } catch (error: any) {
        throw error
    }
}

const createTask = async (taskInfo: Task): Promise<TaskModel> => {
    taskInfo.status = TaskStatus.waiting
    taskInfo.progress = 0
    taskInfo.downloadRanges = []
    const [error, task] = await handlePromise<TaskModel>(TaskModel.create({
        ...taskInfo
    }))
    if (error) {
        throw error
    }
    // instances.set(taskNo, task as TaskModel)
    // const clone: Task = Object.assign(Object.create(Object.getPrototypeOf(new Task())), taskInfo)
    return task as TaskModel
}

const createTaskSet = (): void => {
    
}

const updateTask = async (task: TaskModel): Promise<void> => {
    const [error, _] = await handlePromise<TaskModel>(task.save())
    if (error) {
        throw error
    }
}

const updateTaskPart = async (task: TaskModel, taskPart: any, partName: string): Promise<void> => {
    const [error, _] = await handlePromise<TaskModel>(task.update({ [partName]: taskPart }))
    if (error) {
        throw error
    }
}

const updateTaskStatus = async (task: TaskModel, taskStatus: TaskStatus): Promise<void> => {
    const [error, _] = await handlePromise<void>(updateTaskPart(task, taskStatus, 'status'))
    if (error) {
        throw error
    }
}

const updateTaskProgress = async (task: TaskModel, taskProgress: number): Promise<void> => {
    const [error, _] = await handlePromise<void>(updateTaskPart(task, taskProgress, 'progress'))
    if (error) {
        throw error
    }
}

const updateTaskRanges = async (task: TaskModel, taskRanges: Array<Array<number>>): Promise<void> => {
    const [error, _] = await handlePromise<void>(updateTaskPart(task, taskRanges, 'downloadRanges'))
    if (error) {
        throw error
    }
}

const deleteTask = async (task: TaskModel): Promise<void> => {
    const [error, _] = await handlePromise<void>(task.destroy())
    if (error) {
        throw error
    }
}

const getAllTasks = async (): Promise<Array<TaskModel>> => {
    const [error, tasks] = await handlePromise<Array<TaskModel>>(TaskModel.findAll())
    if (error) {
        throw error
    }
    return tasks as Array<TaskModel>
}

export {
    TaskModel,
    initPersistence,
    createTask,
    createTaskSet,
    updateTask,
    updateTaskStatus,
    updateTaskProgress,
    updateTaskRanges,
    deleteTask,
    getAllTasks
}