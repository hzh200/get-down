import { Task, TaskItem, TaskStatus } from '../../share/models'
import { TaskField } from '../../share/models/model_type'
import { TaskModel } from '../persistence'

const instances: Array<TaskModel> = []
const instanceMap: Map<number, TaskModel> = new Map()

const taskQueue = {
    addTaskItem: (taskNo: number, task: TaskModel): void => {
        instances.push(task)
        instanceMap.set(taskNo, task)
    },
    getTaskItem: (taskNo: number): TaskModel | null => {
        if (!instanceMap.has(taskNo)) {
            return null
        }
        const taskItem = instanceMap.get(taskNo) as TaskModel
        return taskItem
    },
    // getTaskItems: (): Array<TaskModel> => instances,
    getWaitingTaskNo: (): number | null => {
        for (let i = 0; i < instances.length; i++) {
            if (instances[i] instanceof TaskModel && instances[i].get(`${TaskField.status}`) as TaskStatus === TaskStatus.waiting) {
                return instances[i].get(`${TaskField.taskNo}`) as number
            }
        }
        return null;
    },
    getWaitingTaskNos: (num: number): Array<number> | null => {
        const waitingItemArray: Array<number> = []
        for (let i = 0; i < instances.length; i++) {
            if (instances[i] instanceof TaskModel && instances[i].get(`${TaskField.status}`) as TaskStatus === TaskStatus.waiting) {
                waitingItemArray.push(instances[i].get(`${TaskField.taskNo}`) as number);
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

export { taskQueue }