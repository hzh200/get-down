import { TaskType } from "../../../share/models"

class DownloadInfo {
    taskNo: number
    taskType: TaskType
    lastProgress: number
    lastTime: number
    speed: string
}

export default DownloadInfo