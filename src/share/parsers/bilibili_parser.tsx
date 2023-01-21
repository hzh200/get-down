import * as React from 'react'
import * as http from 'node:http'
import * as path from 'node:path'
import { Parser, ParsedInfo } from './parser'
import InfoRow from './InfoRow'
import { Task, DownloadType, TaskSet } from '../../share/models'
import { Setting, readSetting, handlePromise } from '../utils'
import { ipcRenderer } from 'electron'
import { CommunicateAPIName } from '../communication'
import { httpRequest, getHttpRequestTextContent } from '../http/request'
import { generateRequestOption, getPreflightHeaders } from '../http/options'
import { PreflightInfo, preflight } from './preflight'
import { Header, FILE_EXTENSION_DOT } from '../http/constants'

const BV_RE = new RegExp('BV[a-zA-Z0-9]+')
const Web_INTERFACE_API = 'https://api.bilibili.com/x/web-interface/view'
const PLAYER_API = 'https://api.bilibili.com/x/player/playurl'

class BiliBiliParsedInfo extends ParsedInfo {
    url: string
    listInfo: ListInfo
    listCount: number
    declare name: string
    declare location: string
    selectedVideos: Array<boolean>
    selectedFormats: Array<string>
    preflightInfos: Array<PreflightInfo>
}

class ListInfo {
    bvid: string
    aid: string
    title: string
    videos: Array<VideoInfo> = []
}

class VideoInfo {
    cid: string
    title: string
    formats: Array<FormatInfo> = []
}

class FormatInfo {
    quality: string
    format: string
    display: string
    description: string
    urls: Array<FormatInfoUrl> = []
}

type FormatInfoUrl = string

class BiliBiliParser implements Parser {
    parserNo: number = 1
    parseTarget: string = 'bilibili'

    requestHeaders: http.OutgoingHttpHeaders = {
        [Header.Referer]: 'https://www.bilibili.com'
    }

    getListInfo = async (url: string): Promise<ListInfo> => {
        const execResult: RegExpExecArray | null = BV_RE.exec(url)
        if (!execResult) {
            throw new Error("input is not a valid argument")
        }
        const videolist = new ListInfo()
        videolist.bvid = execResult.toString()
        let requestOptions: http.RequestOptions = await generateRequestOption(`${Web_INTERFACE_API}?bvid=${videolist.bvid}`, getPreflightHeaders)
        let [httpRequestErr, [request, response]]: [Error | undefined, [http.ClientRequest, http.IncomingMessage]] = 
            await handlePromise<[http.ClientRequest, http.IncomingMessage]>(httpRequest(requestOptions))
        if (httpRequestErr) {
            throw httpRequestErr
        }
        const [getContentErr, rawData]: [Error | undefined, string] = await handlePromise<string>(getHttpRequestTextContent(request, response))
        if (getContentErr) {
            throw getContentErr
        }
        const parsedData = JSON.parse(rawData)
        if (parsedData['code'] !== 0) {
            throw new Error('parsedData[\'code\'] = 0')
        }
        const data = parsedData['data']
        videolist.aid = data['aid']
        videolist.title = data['title']
        const pages = data['pages']
        for (const page of pages) {
            const video = new VideoInfo()
            video.cid = page['cid']
            video.title = page['part']
            video.formats = await this.getFormatInfos(videolist.aid, video.cid)
            videolist.videos.push(video)
        }
        return videolist
    }

    getFormatInfos = async (aid: string, cid: string): Promise<Array<FormatInfo>> => {
        const requestOptions = await generateRequestOption(`${PLAYER_API}?avid=${aid}&cid=%20${cid}`, getPreflightHeaders)
        const [httpRequestErr, [request, response]] = 
            await handlePromise<[http.ClientRequest, http.IncomingMessage]>(httpRequest(requestOptions))
        if (httpRequestErr) {
            throw httpRequestErr
        }
        const [getContentErr, rawData]: [Error | undefined, string] = await handlePromise<string>(getHttpRequestTextContent(request, response))
        if (getContentErr) {
            throw getContentErr
        }
        const parsedData = JSON.parse(rawData)
        const data = parsedData['data']
        const supportFormats = data['support_formats']
        const formats: Array<FormatInfo> = []
        for (const val of supportFormats) {
            const format = new FormatInfo()
            format.quality = val['quality']
            format.format = val['format']
            format.description = val['new_description']
            format.display = val['display_desc']
            format.urls = await this.getVideoURLs(aid, cid, format.quality)
            formats.push(format)
        }
        return formats
    }

    getVideoURLs = async (aid: string, cid: string, quality: string): Promise<Array<FormatInfoUrl>> => {
        const requestOptions = await generateRequestOption(`${PLAYER_API}?avid=${aid}&cid=%20${cid}&qn=${quality}`, getPreflightHeaders)
        const [httpRequestErr, [request, response]] = 
            await handlePromise<[http.ClientRequest, http.IncomingMessage]>(httpRequest(requestOptions))
        if (httpRequestErr) {
            throw httpRequestErr
        }
        const [getContentErr, rawData]: [Error | undefined, string] = await handlePromise<string>(getHttpRequestTextContent(request, response))
        if (getContentErr) {
            throw getContentErr
        }
        const parsedData = JSON.parse(rawData)
        const data = parsedData['data']
        const durl = data['durl']
        
        const urls: Array<FormatInfoUrl> = []
        for (const url of durl) {
            urls.push(url['url'])
        }
        return urls
    }

    parse = async (url: string): Promise<ParsedInfo> => {
        const setting: Setting = readSetting()
        const videolist: ListInfo = await this.getListInfo(url)

        const parsedInfo = new BiliBiliParsedInfo()
        parsedInfo.url = url
        parsedInfo.listInfo = videolist
        parsedInfo.listCount = videolist.videos.length
        parsedInfo.name = videolist.title
        parsedInfo.location = setting.location
        parsedInfo.selectedVideos = Array(parsedInfo.listCount).fill(true)
        parsedInfo.selectedFormats = Array(parsedInfo.listCount).fill('')
        for (let i = 0; i < parsedInfo.listCount; i++) {
            parsedInfo.selectedFormats[i] = parsedInfo.listInfo.videos[i].formats[0].quality
        }
        return parsedInfo
    }
    
    DownloadOptions = ({ parsedInfo, handleInfoChange } : 
        { parsedInfo: BiliBiliParsedInfo, handleInfoChange: React.ChangeEventHandler<HTMLElement> }): React.ReactElement => {
        if (parsedInfo.listCount === 1) {
            return (
                <React.Fragment>
                    <InfoRow>
                        <label>File name</label>
                        <input className="resource-name" type="text" value={parsedInfo.name} name='name' onChange={handleInfoChange} />
                    </InfoRow>
                    <InfoRow>
                        <label>Location</label>
                        <input className="download-location" type="text" value={parsedInfo.location} name='location' onChange={handleInfoChange} />
                    </InfoRow>
                    <InfoRow>
                        <label>Quality</label>
                        <select className="format-selecter" value={parsedInfo.selectedFormats[0]} name='selectedFormats-0' onChange={handleInfoChange}>
                            {parsedInfo.listInfo.videos[0].formats.map((format: FormatInfo, index: number, _array: Array<FormatInfo>) => 
                                <option value={format.quality} key={index}>{format.description}</option>
                            )}
                        </select>
                    </InfoRow>
                </React.Fragment>
            )
        } else {
            return (
                <React.Fragment>
                    <InfoRow>
                        <label>Folder name:</label>
                        <input className="resource-name" type="text" value={parsedInfo.name} name='name' onChange={handleInfoChange} />
                    </InfoRow>
                    <InfoRow>
                        <label>Location:</label>
                        <input className="download-location" type="text" value={parsedInfo.location} name='location' onChange={handleInfoChange} />
                    </InfoRow>
                    <InfoRow>
                        <label>Video:</label>
                        <div>
                            {parsedInfo.listInfo.videos.map((video: VideoInfo, index: number, _array: Array<VideoInfo>) => 
                                <div key={index}>
                                    <input className="video-select" type="checkbox" checked={parsedInfo.selectedVideos[index]} name={`selectedVideos-${index}`} onChange={handleInfoChange} />
                                    <label>{video.title}</label>
                                    <select className="format-selecter" value={parsedInfo.selectedFormats[index]} name={`selectedFormats-${index}`} onChange={handleInfoChange}>
                                        {
                                            video.formats.map((format: FormatInfo, index: number, _array: Array<FormatInfo>) => 
                                                <option value={format.quality} key={index}>{format.description}</option>
                                            )
                                        }
                                    </select>
                                </div>
                            )}
                        </div>
                    </InfoRow>
                </React.Fragment>
            )
        }
    }

    addTask = async (parsedInfo: BiliBiliParsedInfo): Promise<void> => {
        if (parsedInfo.listCount === 1) {
            let targetFormat: FormatInfo = parsedInfo.listInfo.videos[0].formats[0]
            for (const format of parsedInfo.listInfo.videos[0].formats) {
                if (format.quality === parsedInfo.selectedFormats[0]) {
                    targetFormat = format
                    break
                }
            }
            const [err, preflightParsedInfo]: [Error | undefined, PreflightInfo] = 
                await handlePromise<PreflightInfo>(preflight(targetFormat.urls[0], this.requestHeaders))
            if (err) {
                throw err
            }
            const task = new Task()
            task.name = parsedInfo.name + FILE_EXTENSION_DOT + preflightParsedInfo.subType
            task.size = preflightParsedInfo.size
            task.type = preflightParsedInfo.type
            task.url = parsedInfo.url
            task.downloadUrl = preflightParsedInfo.downloadUrl
            task.createdAt = preflightParsedInfo.createdAt
            task.subType = preflightParsedInfo.subType
            task.charset = preflightParsedInfo.charset
            task.location = parsedInfo.location
            task.downloadType = preflightParsedInfo.downloadType
            task.parserNo = this.parserNo
            ipcRenderer.send(CommunicateAPIName.AddTask, task)
        } else {
            const tasks: Array<Task> = []
            for (let i = 0; i < parsedInfo.listCount; i++) {
                if (!parsedInfo.selectedVideos[i]) {
                    continue
                }
                for (const format of parsedInfo.listInfo.videos[i].formats) {
                    if (format.quality === parsedInfo.selectedFormats[i]) {
                        const [err, preflightParsedInfo]: [Error | undefined, PreflightInfo] = 
                            await handlePromise<PreflightInfo>(preflight(format.urls[0], this.requestHeaders))
                        if (err) {
                            throw err
                        }
                        const task = new Task()
                        task.name = parsedInfo.listInfo.videos[i].title + FILE_EXTENSION_DOT + preflightParsedInfo.subType
                        task.size = preflightParsedInfo.size
                        task.type = preflightParsedInfo.type
                        task.url = preflightParsedInfo.url
                        task.downloadUrl = preflightParsedInfo.downloadUrl
                        task.createdAt = preflightParsedInfo.createdAt
                        task.subType = preflightParsedInfo.subType
                        task.charset = preflightParsedInfo.charset
                        task.location = path.join(parsedInfo.location, parsedInfo.name)
                        task.downloadType = preflightParsedInfo.downloadType
                        task.parserNo = this.parserNo
                        tasks.push(task)
                        break
                    }
                }
            }
            const taskSet = new TaskSet()
            taskSet.name = parsedInfo.name
            taskSet.size = 0
            for (const task of tasks) {
                if (!task.size) {
                    taskSet.size = undefined
                    break
                }
                taskSet.size += task.size
            }
            taskSet.type = 'folder'
            taskSet.url = parsedInfo.url
            // taskSet.createdAt = tasks[0].createdAt
            taskSet.location = parsedInfo.location
            taskSet.parserNo = this.parserNo
    
            ipcRenderer.send(CommunicateAPIName.AddTaskSet, [taskSet, tasks])
        }
    }
}

export default BiliBiliParser