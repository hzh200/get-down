import * as React from 'react'
import * as http from 'node:http'
import * as path from 'node:path'
import * as fs from 'node:fs'
import * as EventEmitter from 'node:stream'
import { exec, ExecException, ChildProcess } from 'node:child_process'
import { Parser, ParsedInfo, DownloadOptionsBase } from './parser'
import InfoRow from './InfoRow'
import { Task, DownloadType, TaskSet } from '../../share/models'
import { Setting, readSetting, handlePromise, Log } from '../utils'
import { ipcRenderer } from 'electron'
import { CommunicateAPIName } from '../global/communication'
import { httpRequest, getHttpRequestTextContent } from '../http/request'
import { generateRequestOption, getPreflightHeaders } from '../http/options'
import { PreflightInfo, preflight } from './preflight'
import { Header, FILE_EXTENSION_DOT } from '../http/constants'
import taskQueue from '../../main/queue'
import { TaskModel, TaskSetModel } from '../../main/persistence/model_types'

const TITLE_RE = new RegExp('<title>(.*) - YouTube<\/title>')
const FORMATS_RE = new RegExp('\"formats\".+?]', 'g')
const ADAPTIVE_FORMATS_RE = new RegExp('\"adaptiveFormats\".+?]')
const MIMETYPE_RE = new RegExp('(video|audio)/(.+)\; codecs=\"(.+)\"')

class YoutubeParsedInfo extends ParsedInfo {
    url: string
    declare name: string
    declare location: string

    hasMixture: boolean
    mixtureFormats: Array<FormatInfo> = []
    hasAdaptive: boolean
    videoFormats: Array<FormatInfo> = []
    audioFormats: Array<FormatInfo> = []

    selection: Selection
}

class FormatInfo {
    url: string
    quality: string
    mimeType: string
    type: string
    subType: string
    codecs: string
    publishedTimestamp: string
}

class Selection {
    selectedMixtureFormat: FormatInfo | undefined
    selectedVideoFormat: FormatInfo | undefined
    selectedAudioFormat: FormatInfo | undefined
}

class YoutubeParser implements Parser {
    parserNo: number = 2
    parseTarget: string = 'YouTube'

    requestHeaders: http.OutgoingHttpHeaders = {
        [Header.Referer]: 'https://www.youtube.com'
    }

    parseFormatInfo = async (parsedInfo: YoutubeParsedInfo, data: string): Promise<void> => {
        const streamingDataLine = data.split('\n').find((value: string, _index: number, _array: Array<string>) => value.includes('streamingData'))
        if (!streamingDataLine) {
            throw new Error('no streamingData found')
        }

        let titleExecResult: RegExpExecArray | null = TITLE_RE.exec(data)
        if (!titleExecResult) {
            throw new Error("no title exec result")
        }
        parsedInfo.name = titleExecResult[1]

        // extract mixtured video urls.
        const mixtureFormatsExecResultArray: Array<RegExpExecArray> = []
        let mixtureFormatsExecResult: RegExpExecArray | null
        while ((mixtureFormatsExecResult =  FORMATS_RE.exec(streamingDataLine)) !== null) {
            mixtureFormatsExecResultArray.push(mixtureFormatsExecResult)
        }
        if (mixtureFormatsExecResultArray.length === null) {
            throw new Error('no formats exec result')
        }
        mixtureFormatsExecResult = mixtureFormatsExecResultArray[mixtureFormatsExecResultArray.length - 1] // there are other lines containing streamingData, what we need is the last one.
        let mixtureFormatData = JSON.parse('{' + mixtureFormatsExecResult[0] + '}')
        parsedInfo.hasMixture = false
        for (const data of mixtureFormatData.formats) {
            const format = new FormatInfo()
            if (!data.url && !data.signatureCipher) {
                continue
            } else if (data.url) {
                format.url = data.url
            } else {
                
            }
            format.mimeType = data.mimeType
            const typeExecResult: RegExpExecArray | null = MIMETYPE_RE.exec(data.mimeType)
            if (typeExecResult) {
                format.type = typeExecResult[1]
                format.subType = typeExecResult[2]
                // format.codecs = typeExecResult[3] // useless
            }
            format.quality = data.qualityLabel
            format.publishedTimestamp = data.lastModified
            parsedInfo.mixtureFormats.push(format)
            parsedInfo.hasMixture = true
        }    
        
        // extract adaptive video and audio urls.
        let adaptiveFormatsExecResult: RegExpExecArray | null = ADAPTIVE_FORMATS_RE.exec(streamingDataLine)
        if (adaptiveFormatsExecResult === null) {
            throw new Error('no valid video urls parsed out')
        }

        let adaptiveFormatData = JSON.parse('{' + adaptiveFormatsExecResult[0] + '}')
        parsedInfo.hasAdaptive = false
        for (const data of adaptiveFormatData.adaptiveFormats) {
            const format = new FormatInfo()
            if (!data.url && !data.signatureCipher) {
                continue
            } else if (data.url) {
                format.url = data.url
            } else {
                
            }
            format.mimeType = data.mimeType   
            const regexRes: RegExpExecArray | null = MIMETYPE_RE.exec(data.mimeType)
            if (regexRes) {
                format.type = regexRes[1]
                format.subType = regexRes[2]
                if (regexRes[3].startsWith('vp9')) {
                    format.codecs = 'vp9'
                } else if (regexRes[3].startsWith('av01')) {
                    format.codecs = 'av1'
                } else if (regexRes[3].startsWith('avc')) {
                    format.codecs = 'avc'
                } else if (regexRes[3].startsWith('opus')) {
                    format.codecs = 'opus'
                } else if (regexRes[3].startsWith('mp4a')) {
                    format.codecs = 'mp4a'
                }
            }
            format.publishedTimestamp = data.lastModified
            if (format.type === 'video') {
                format.quality = data.qualityLabel
                const lastFormat: FormatInfo | undefined = parsedInfo.videoFormats.pop()
                if (lastFormat && (lastFormat.subType !== format.subType || lastFormat.codecs !== format.codecs || lastFormat.quality !== format.quality)) {
                    parsedInfo.videoFormats.push(lastFormat)
                }
                parsedInfo.videoFormats.push(format)
            } else if (format.type === 'audio') {
                format.quality = data.audioQuality
                const lastFormat: FormatInfo | undefined = parsedInfo.audioFormats.pop()
                if (lastFormat && (lastFormat.subType !== format.subType || lastFormat.codecs !== format.codecs || lastFormat.quality !== format.quality)) {
                    parsedInfo.audioFormats.push(lastFormat)
                }
                parsedInfo.audioFormats.push(format)
            }
            parsedInfo.hasAdaptive = true
        }

        if (!parsedInfo.hasMixture && !parsedInfo.hasAdaptive) {
            throw new Error('no formats parsed out')
        }

        // sort all kinds of formats in descending order by quality.
        const sortFormats = () => {
            const sortVideoQuality = (qualityA: string, qualityB: string): number => {
                const resolutionA: number = parseInt(qualityA.slice(0, qualityA.indexOf('p')))
                const resolutionB: number = parseInt(qualityB.slice(0, qualityB.indexOf('p')))
                if (resolutionA > resolutionB) {
                    return 1
                } else if (resolutionA < resolutionB) {
                    return -1
                }
                if (qualityA.length > qualityB.length) {
                    return 1
                } else if (qualityA.length < qualityB.length) {
                    return -1
                }
                if (!qualityA.endsWith('p')) { // b is the same
                    try {
                        const frameA: number = parseInt(qualityA.slice(qualityA.indexOf('p')))
                        const frameB: number = parseInt(qualityB.slice(qualityB.indexOf('p')))
                        if (frameA > frameB) {
                            return 1
                        } else {
                            return -1
                        }
                    } catch (error: any) { // Not frame, 'HDR' maybe.
                        return 0
                    }
                } 
                return 0
            }

            const sortVideoCodecs = (codecsA: string, codecsB: string): number => {
                const sortInfo: Array<[string, number]> = [[codecsA, -1], [codecsB, -1]]
                for (let i = 0; i < 2; i++) {
                    if (sortInfo[i][0].includes('vp9')) {
                        sortInfo[i][1] = 2
                    } else if (sortInfo[i][0].includes('av01')) {
                        sortInfo[i][1] = 1
                    } else if (sortInfo[i][0].includes('avc')) {
                        sortInfo[i][1] = 0
                    }
                }
                if (sortInfo[0][1] > sortInfo[1][1]) {
                    return 1
                } else if (sortInfo[0][1] < sortInfo[1][1]) {
                    return -1
                }
                return 0
            }

            const sortAudioQuality = (qualityA: string, qualityB: string): number => {
                const sortInfo: Array<[string, number]> = [[qualityA, -1], [qualityB, -1]]
                for (let i = 0; i < 2; i++) {
                    if (sortInfo[i][0].includes('HIGH')) {
                        sortInfo[i][1] = 2
                    } else if (sortInfo[i][0].includes('MEDIUM')) {
                        sortInfo[i][1] = 1
                    } else if (sortInfo[i][0].includes('LOW')) {
                        sortInfo[i][1] = 0
                    }
                }
                if (sortInfo[0][1] > sortInfo[1][1]) {
                    return 1
                } else if (sortInfo[0][1] < sortInfo[1][1]) {
                    return -1
                }
                return 0
            }

            const sortAudioCodecs = (codecsA: string, codecsB: string): number => {
                const sortInfo: Array<[string, number]> = [[codecsA, -1], [codecsB, -1]]
                for (let i = 0; i < 2; i++) {
                    if (sortInfo[i][0].includes('opus')) {
                        sortInfo[i][1] = 1
                    } else if (sortInfo[i][0].includes('mp4a')) {
                        sortInfo[i][1] = 0
                    }
                }
                if (sortInfo[0][1] > sortInfo[1][1]) {
                    return 1
                } else {
                    return -1
                }
            }
            
            parsedInfo.mixtureFormats = parsedInfo.mixtureFormats.sort((a: FormatInfo, b: FormatInfo) => {
                return -sortVideoQuality(a.quality, b.quality)
            })
            parsedInfo.videoFormats = parsedInfo.videoFormats.sort((a: FormatInfo, b: FormatInfo) => {
                const relation: number = sortVideoQuality(a.quality, b.quality)
                if (relation !== 0) {
                    return -relation
                }
                return -sortVideoCodecs(a.codecs, b.codecs)
            })
            parsedInfo.audioFormats = parsedInfo.audioFormats.sort((a: FormatInfo, b: FormatInfo) => {
                const relation: number = sortAudioQuality(a.quality, b.quality)
                if (relation !== 0) {
                    return -relation
                }
                return -sortAudioCodecs(a.codecs, b.codecs)
            })
        }
        sortFormats()
    }

    parse = async (url: string): Promise<ParsedInfo> => {
        'https://www.youtube.com/watch?v=RWMMdX6KYGM&bpctr=9999999999&has_verified=1'
        let requestOptions: http.RequestOptions = await generateRequestOption(url, getPreflightHeaders)
        let [httpRequestErr, [request, response]]: [Error | undefined, [http.ClientRequest, http.IncomingMessage]] = 
            await handlePromise<[http.ClientRequest, http.IncomingMessage]>(httpRequest(requestOptions))
        if (httpRequestErr) {
            throw httpRequestErr
        }
        const [getContentErr, rawData]: [Error | undefined, string] = await handlePromise<string>(getHttpRequestTextContent(request, response))
        if (getContentErr) {
            throw getContentErr
        }
        const parsedInfo = new YoutubeParsedInfo()
        parsedInfo.url = url
        const setting: Setting = readSetting()
        parsedInfo.location = setting.location
        try {
            await this.parseFormatInfo(parsedInfo, rawData)
        } catch (e: any) {
            console.log(rawData)
            throw e
        }
        
        parsedInfo.selection = new Selection()
        if (parsedInfo.hasMixture) {
            parsedInfo.selection.selectedMixtureFormat = parsedInfo.mixtureFormats[0]
        }
        if (parsedInfo.hasAdaptive) {
            // parsedInfo.selection.selectedVideoFormat = {...parsedInfo.videoFormats[0]}
            // parsedInfo.selection.selectedAudioFormat = {...parsedInfo.audioFormats[0]}
            parsedInfo.selection.selectedVideoFormat = parsedInfo.videoFormats[0]
            parsedInfo.selection.selectedAudioFormat = parsedInfo.audioFormats[0]
        }
        return parsedInfo
    }
    
    DownloadOptions = ({ parsedInfo, handleInfoChange }: 
        { parsedInfo: YoutubeParsedInfo, handleInfoChange: React.ChangeEventHandler<HTMLElement> }): React.ReactElement => {
        return (
            <React.Fragment>
                <DownloadOptionsBase parsedInfo={parsedInfo} handleInfoChange={handleInfoChange} />
                {(() => {
                    if (parsedInfo.hasAdaptive === false) {
                        return (
                            <InfoRow>
                                <label>Quality</label>
                                <select className="format-selecter" value={parsedInfo.selection.selectedMixtureFormat?.quality} name='selectedMixtureQuality' onChange={handleInfoChange}>
                                    {parsedInfo.mixtureFormats.map((format: FormatInfo, index: number, _array: Array<FormatInfo>) => 
                                        <option value={format.quality} key={index}>{format.quality}</option>
                                    )}
                                </select>
                            </InfoRow>
                        )
                    } else {
                        return (
                            <React.Fragment>
                                <InfoRow>
                                    <label>Video Quality</label>
                                    <select className="format-selecter" value={parsedInfo.selection.selectedVideoFormat?.quality} name='selectedVideoFormat-quality' onChange={handleInfoChange}>
                                        {(() => {
                                            let qualities: Array<string> = []
                                            for (const format of parsedInfo.videoFormats) {
                                                qualities.push(format.quality)
                                            }
                                            qualities = Array.from(new Set(qualities))
                                            return (
                                                qualities.map((quality: string, index: number, _array: Array<string>) => 
                                                    <option value={quality} key={index}>{quality}</option>
                                                )
                                            )
                                        })()}
                                    </select>
                                    <label>Video Codecs</label>
                                    <select className="format-selecter" value={parsedInfo.selection.selectedVideoFormat?.codecs} name='selectedVideoFormat-codecs' onChange={handleInfoChange}>
                                        {(() => {
                                            let codecses: Array<string> = []
                                            for (const format of parsedInfo.videoFormats) {
                                                if (format.quality === (parsedInfo.selection.selectedVideoFormat as FormatInfo).quality) {
                                                    codecses.push(format.codecs)
                                                }
                                            }
                                            codecses = Array.from(new Set(codecses))
                                            return (
                                                codecses.map((codecs: string, index: number, _array: Array<string>) => 
                                                    <option value={codecs} key={index}>{codecs}</option>)
                                            )
                                        })()}
                                    </select>
                                </InfoRow>
                                <InfoRow>
                                    <label>Audio Quality</label>
                                    <select className="format-selecter" value={parsedInfo.selection.selectedAudioFormat?.quality} name='selectedAudioFormat-quality' onChange={handleInfoChange}>
                                        {(() => {
                                            let qualities: Array<string> = []
                                            for (const format of parsedInfo.audioFormats) {
                                                qualities.push(format.quality)
                                            }
                                            qualities = Array.from(new Set(qualities))
                                            return (
                                                qualities.map((quality: string, index: number, _array: Array<string>) => 
                                                    <option value={quality} key={index}>{
                                                        (() => {
                                                        const splits: string[]  = quality.split('_')
                                                        return splits[splits.length - 1]
                                                        })()
                                                    }</option>
                                                )
                                            )
                                        })()}
                                    </select>
                                    <label>Audio Codecs</label>
                                    <select className="format-selecter" value={(parsedInfo.selection.selectedAudioFormat as FormatInfo).codecs} name='selectedAudioFormat-codecs' onChange={handleInfoChange}>
                                        {(() => {
                                            let codecses: Array<string> = []
                                            for (const format of parsedInfo.audioFormats) {
                                                if (format.quality === (parsedInfo.selection.selectedAudioFormat as FormatInfo).quality) {
                                                    codecses.push(format.codecs)
                                                }
                                            }
                                            codecses = Array.from(new Set(codecses))
                                            return (
                                                codecses.map((codecs: string, index: number, _array: Array<string>) => 
                                                    <option value={codecs} key={index}>{codecs}</option>)
                                            )
                                        })()}
                                    </select>
                                </InfoRow>
                            </React.Fragment>
                        )
                    }
                })()}
            </React.Fragment>
        )
    }

    addTask = async (parsedInfo: YoutubeParsedInfo): Promise<void> => {
        if (parsedInfo.hasAdaptive === false) {
            let videoFormat: FormatInfo = parsedInfo.videoFormats[0]
            for (const format of parsedInfo.videoFormats) {
                if (format.quality === parsedInfo.selection.selectedMixtureFormat?.quality) {
                    videoFormat = format
                    break
                }
            }
            let [err, preflightParsedInfo]: [Error | undefined, PreflightInfo] = 
                await handlePromise<PreflightInfo>(preflight(videoFormat.url, this.requestHeaders))
            if (err) {
                throw err
            }
            const videoTask = new Task()
            videoTask.name = parsedInfo.name + FILE_EXTENSION_DOT + preflightParsedInfo.subType
            videoTask.size = preflightParsedInfo.size
            videoTask.type = preflightParsedInfo.type
            videoTask.url = parsedInfo.url
            videoTask.downloadUrl = preflightParsedInfo.downloadUrl
            videoTask.publishedTimestamp = videoFormat.publishedTimestamp
            videoTask.subType = preflightParsedInfo.subType
            videoTask.charset = preflightParsedInfo.charset
            videoTask.location = parsedInfo.location
            videoTask.downloadType = preflightParsedInfo.downloadType
            videoTask.parserNo = this.parserNo

            ipcRenderer.send(CommunicateAPIName.AddTask, videoTask)
        } else {
            let videoFormat: FormatInfo = parsedInfo.videoFormats[0]
            for (const format of parsedInfo.videoFormats) {
                if (format.quality === parsedInfo.selection.selectedVideoFormat?.quality && format.codecs === parsedInfo.selection.selectedVideoFormat?.codecs) {
                    videoFormat = format
                    break
                }
            }
            let [err, preflightParsedInfo]: [Error | undefined, PreflightInfo] = 
                await handlePromise<PreflightInfo>(preflight(videoFormat.url, this.requestHeaders))
            if (err) {
                throw err
            }
            const videoTask = new Task()
            videoTask.name = parsedInfo.name + '_video' + FILE_EXTENSION_DOT + preflightParsedInfo.subType
            videoTask.size = preflightParsedInfo.size
            videoTask.type = preflightParsedInfo.type
            videoTask.url = parsedInfo.url
            videoTask.downloadUrl = preflightParsedInfo.downloadUrl
            videoTask.publishedTimestamp = videoFormat.publishedTimestamp
            videoTask.subType = preflightParsedInfo.subType
            videoTask.charset = preflightParsedInfo.charset
            videoTask.location = parsedInfo.location
            videoTask.downloadType = preflightParsedInfo.downloadType
            videoTask.parserNo = this.parserNo
    
            let audioFormat: FormatInfo = parsedInfo.audioFormats[0]
            ;[err, preflightParsedInfo] = await handlePromise<PreflightInfo>(preflight(audioFormat.url, this.requestHeaders))
            if (err) {
                throw err
            }
            const audioTask = new Task()
            audioTask.name = parsedInfo.name + '_audio' + FILE_EXTENSION_DOT + preflightParsedInfo.subType
            audioTask.size = preflightParsedInfo.size
            audioTask.type = preflightParsedInfo.type
            audioTask.url = parsedInfo.url
            audioTask.downloadUrl = preflightParsedInfo.downloadUrl
            audioTask.publishedTimestamp = audioFormat.publishedTimestamp
            audioTask.subType = preflightParsedInfo.subType
            audioTask.charset = preflightParsedInfo.charset
            audioTask.location = parsedInfo.location
            audioTask.downloadType = preflightParsedInfo.downloadType
            audioTask.parserNo = this.parserNo
    
            const taskSet = new TaskSet()
            taskSet.name = parsedInfo.name
            if (!videoTask.size || !audioTask.size) {
                taskSet.size = undefined
            } else {
                taskSet.size = videoTask.size + audioTask.size
            }
            taskSet.type = 'folder'
            taskSet.url = parsedInfo.url
            taskSet.location = parsedInfo.location
            taskSet.parserNo = this.parserNo
    
            ipcRenderer.send(CommunicateAPIName.AddTaskSet, [taskSet, [videoTask, audioTask]])
        }
    }

    taskSetCallback(mainEventEmitter: EventEmitter, taskNo: number): Promise<void> {
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
                        mainEventEmitter.emit(CommunicateAPIName.AddFile, newMergePath, videoTask.publishedTimestamp)
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

export default YoutubeParser