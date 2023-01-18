import { Task, TaskItem, TaskSet } from '../../../share/models'

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

const convertBytesToHumanReadable = (bytes: number) => {
    let count: number = 0
    while (bytes > 1024) {
        bytes = bytes / 1024
        count++
    }
    bytes = Math.round(bytes * 100) / 100
    return bytes.toString() + UNITS[count]
}

// can't be used in React hooks
const calculateTransferSpeedAuto = (taskItem: TaskItem): Promise<string> => {
    return new Promise((resolve, reject) => {
        const start = [taskItem.progress, new Date().getTime()]
        setTimeout(() => {
            const end = [taskItem.progress, new Date().getTime()]
            console.log(end[0], ' ', start[0])
            const speed = convertBytesToHumanReadable((end[0] - start[0]) * 1000 / (end[1] - start[1])) + '/s'
            resolve(speed)
        }, 1000)
    })
}

const calculateTransferSpeed = (bytes: number, milliseconds: number): string => {
    return convertBytesToHumanReadable(bytes * 1000 / milliseconds) + '/s'
}

export { convertBytesToHumanReadable, calculateTransferSpeedAuto, calculateTransferSpeed }