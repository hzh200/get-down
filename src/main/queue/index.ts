import { Task, TaskItem, TaskStatus } from '../../common/models'
import { TaskModel } from '../persistence'

const instances: Array<TaskModel> = []
const instanceMap: Map<number, TaskModel> = new Map()

const taskQueue = {
    addTaskItem: (taskNo: number, task: TaskModel): void => {
        instances.push(task)
        instanceMap.set(taskNo, task)
    },
    getTaskItem: (taskNo: number): TaskModel => {
        if (!instanceMap.has(taskNo)) {
            throw new Error('Taskitem doesn\'t exist')
        }
        const taskItem = instanceMap.get(taskNo) as TaskModel
        return taskItem
    },
    // getTaskItems: (): Array<TaskModel> => instances,
    updateTaskItemProgress: (taskNo: number, progress: number): void => {
        const task = (this as any).getTaskItem(taskNo)
        task.set({
            'progress': progress
        })
    },
    updateTaskItemDownloadRanges: (taskNo: number, ranges: Array<Array<number>>): void => {
        const task = (this as any).getTaskItem(taskNo)
        task.set({
            'downloadRanges': ranges
        })
    },
    updateTaskItemStatus: (taskNo: number, status: TaskStatus): void => {
        const task = (this as any).getTaskItem(taskNo)
        task.set({
            'status': status
        })
    },
    getWaitingTaskNo: (): number => {
        for (let i = 0; i < instances.length; i++) {
            if (instances[i] instanceof TaskModel && instances[i].get('status') as string === TaskStatus.waiting) {
                return instances[i].get('taskNo') as number
            }
        }
        return -1;
    },
    getWaitingTaskNos: (num: number): Array<number> => {
        const waitingItemArray: Array<number> = []
        for (let i = 0; i < instances.length; i++) {
            if (instances[i] instanceof TaskModel && instances[i].get('status') as string === TaskStatus.waiting) {
                waitingItemArray.push(instances[i].get('taskNo') as number);
                num = num - 1
                if (num === 0) break
            }
        }
        return waitingItemArray
    }
}

export { taskQueue }