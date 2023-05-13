import { Task, TaskItem, TaskStatus, TaskType } from '../../share/models'
import { TaskModel, TaskSetModel, ModelField } from '../persistence/model_types'

const instances: Array<TaskModel | TaskSetModel> = []
const taskMap: Map<number, TaskModel> = new Map()
const taskSetMap: Map<number, TaskSetModel> = new Map()

const taskQueue = {
    // addTaskItem: (taskNo: number, task: TaskModel): void => {
    //     instances.push(task)
    //     instanceMap.set(taskNo, task)
    // },
    addTask: (taskNo: number, task: TaskModel): void => {
        instances.push(task)
        taskMap.set(taskNo, task)
    },
    addTaskSet: (taskNo: number, taskSet: TaskSetModel): void => {
        // instances.push(taskSet)
        taskSetMap.set(taskNo, taskSet)
    },
    getTask: (taskNo: number): TaskModel | null => {
        if (!taskMap.has(taskNo)) {
            return null
        }
        return taskMap.get(taskNo) as TaskModel
    },
    getTaskSet: (taskNo: number): TaskSetModel | null => {
        if (!taskSetMap.has(taskNo)) {
            return null
        }
        return taskSetMap.get(taskNo) as TaskSetModel
    },
    getTaskItem: (taskNo: number, taskType: TaskType): TaskModel | TaskSetModel | null => {
        let taskItem: TaskModel | TaskSetModel | null = null
        if (taskType === TaskType.Task && taskMap.has(taskNo)) {
            if (taskMap.has(taskNo)) {
                taskItem = taskMap.get(taskNo) as TaskModel
            }
        } else { // TaskSet
            if (taskSetMap.has(taskNo)) {
                taskItem = taskSetMap.get(taskNo) as TaskSetModel
            }
        }
        return taskItem
    },
    getWaitingTaskNo: (): number | null => {
        for (let i = 0; i < instances.length; i++) {
            if (instances[i] instanceof TaskModel && instances[i].get(`${ModelField.status}`) as TaskStatus === TaskStatus.Waiting) {
                return instances[i].get(`${ModelField.taskNo}`) as number
            }
        }
        return null;
    },
    getWaitingTaskNos: (num: number): Array<number> | null => {
        const waitingItemArray: Array<number> = []
        for (let i = 0; i < instances.length; i++) {
            if (instances[i] instanceof TaskModel && instances[i].get(`${ModelField.status}`) as TaskStatus === TaskStatus.Waiting) {
                waitingItemArray.push(instances[i].get(`${ModelField.taskNo}`) as number);
                num = num - 1
                if (num === 0) break
            }
        }
        if (waitingItemArray.length === 0) {
            return null
        }
        return waitingItemArray
    }
}

export default taskQueue