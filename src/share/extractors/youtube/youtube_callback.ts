import * as path from 'node:path'
import * as fs from 'node:fs'
import { exec, ExecException, ChildProcess } from 'node:child_process'
import taskQueue from '../../../main/queue'
import { TaskModel, TaskSetModel } from '../../../main/persistence/model_types'
import { Callback } from "../interfaces/callback"
import { CommunicateAPIName } from '../../global/communication'
import { changeFileTimestamp } from '../../utils/fileTime'
import YouTube from './youtube'

class YouTubeCallback extends YouTube implements Callback {
    taskSetCallback( taskNo: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const taskSet: TaskSetModel | null = taskQueue.getTaskSet(taskNo)
            if (!taskSet || !taskSet.children || taskSet.children.length !== 2) {
                reject(new Error('can\'t merge'))
                return
            }
            const videoTask = taskQueue.getTask(taskSet.children[0])
            const audioTask = taskQueue.getTask(taskSet.children[1])
            if (!videoTask || !audioTask) {
                reject(new Error('can\'t merge'))
                return
            }
            const videoTaskPath = path.join(videoTask.location, videoTask.name)
            const audioTaskPath = path.join(audioTask.location, audioTask.name)
            let mergePath = path.join(videoTask.location, 'merge_' + videoTask.name.replace('_video', ''))
            if (!mergePath.endsWith('.mp4')) {
                const splits: Array<string> = mergePath.split('.')
                splits.splice(splits.length - 1, 1)
                mergePath = splits.join('.') + '.mp4'
            }

            try {
                fs.unlinkSync(mergePath)
            } catch(e) {}
            new Promise<void>((resolve, reject) => {
                const mergeProcess: ChildProcess = exec(
                    `ffmpeg -i \"${videoTaskPath}\" -i \"${audioTaskPath}\" -c:v copy -c:a aac \"${mergePath}\"`, (error: ExecException | null) => {
                        if (error) { // invoked only when error occuried
                            if (!fs.existsSync(videoTaskPath) || !fs.existsSync(audioTaskPath)) {
                                reject('video or audio path don\'t exist')
                                return
                            }
                            reject(error)
                        }
                    }
                )
                mergeProcess.on('close', (code: number) => {
                    if (code === 0) {
                        resolve()
                    }
                })
            }).then(
                () => {
                    try {
                        fs.unlinkSync(videoTaskPath)
                        fs.unlinkSync(audioTaskPath)
                        const newMergePath = mergePath.replace('merge_', '')
                        fs.renameSync(mergePath, newMergePath)
                        changeFileTimestamp(newMergePath, videoTask.publishedTimestamp)
                    } catch (error: any) {
                        reject(error)
                    }
                    resolve()
                }
            ).catch((error: Error) => {
                reject(error)
            })
        //    mergeProcess.on('close', (code: number) => {
        //         if (code !== 0) { // process returns code 1

        //         } else {

        //         }
        //     })
        })
    }
}

export default YouTubeCallback