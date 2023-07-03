import * as React from 'react'
import { Parser, ParsedInfo, DownloadOptionsBase } from '../interfaces/parser'
import InfoRow from '../InfoRow'
import { Task, DownloadType, TaskSet } from '../../models'
import { Setting, readSetting, Log, matchOne, matchAll } from '../../utils'
import { ipcRenderer } from 'electron'
import { CommunicateAPIName } from '../../global/communication'
import { requestPage, PreflightInfo, preflight } from '../../http/functions'
import { Header, FILE_EXTENSION_DOT } from '../../http/constants'
import YouTube from './youtube'
import decipherSignature from './decipher'

const TITLE_RE = new RegExp('<title>(.*) - YouTube<\\/title>')
const FORMATS_RE = new RegExp('\\"formats\\".+?\]', 'g')
const ADAPTIVE_FORMATS_RE = new RegExp('\\"adaptiveFormats\\".+?\]')
const MIMETYPE_RE = new RegExp('\(video\|audio\)\\/(.+); codecs=\\"(.+)\\"')
const HTML5PLAYER_RE = new RegExp('\\"(\\/s\\/player.+?)\\"')

class YouTubeParsedInfo extends ParsedInfo {
    url: string
    declare name: string
    declare location: string

    hasMultiplexed: boolean
    multiplexedFormats: Array<FormatInfo> = []
    hasAdaptive: boolean
    videoFormats: Array<FormatInfo> = []
    audioFormats: Array<FormatInfo> = []

    selection: Selection
}

class FormatInfo {
    itag: string
    url: string
    quality: string
    mimeType: string
    type: string
    subType: string
    codecs: string
    publishedTimestamp: string
}

class Selection {
    selectedMultiplexedFormat: FormatInfo | undefined
    selectedVideoFormat: FormatInfo | undefined
    selectedAudioFormat: FormatInfo | undefined
}

class YouTubeParser extends YouTube implements Parser {
    parseFormatInfo = async (parsedInfo: YouTubeParsedInfo, data: string, html5player: string): Promise<void> => {
        const streamingDataLine = data.split('\n').find((value: string, _index: number, _array: Array<string>) => value.includes('streamingData'))
        if (!streamingDataLine) throw new Error('no streamingData found')

        parsedInfo.name = matchOne(TITLE_RE, data, 'no title found')[1]

        // extract multiplexed video urls.
        const multiplexedFormatsExecResultArray: Array<RegExpExecArray> = matchAll(FORMATS_RE, streamingDataLine, 'no formats found')
        const multiplexedFormatsExecResult: RegExpExecArray = multiplexedFormatsExecResultArray[multiplexedFormatsExecResultArray.length - 1] // there are other lines containing streamingData, what we need is the last one.
        const multiplexedFormatData = JSON.parse('{' + multiplexedFormatsExecResult[0] + '}')
        parsedInfo.hasMultiplexed = false
        for (const data of multiplexedFormatData.formats) {
            if (!data.url && !data.signatureCipher)
                continue
            const format = new FormatInfo()
            format.url = data.url ? data.url : decipherSignature(html5player, data.signatureCipher)
            format.mimeType = data.mimeType

            const typeExecResult: RegExpExecArray = matchOne(MIMETYPE_RE, data.mimeType)
            format.type = typeExecResult[1]
            format.subType = typeExecResult[2]
            // format.codecs = typeExecResult[3] // useless

            format.quality = data.qualityLabel
            format.publishedTimestamp = data.lastModified
            parsedInfo.multiplexedFormats.push(format)
            parsedInfo.hasMultiplexed = true
        }    
        
        // extract adaptive video and audio urls.
        const adaptiveFormatsExecResult: RegExpExecArray = matchOne(ADAPTIVE_FORMATS_RE, streamingDataLine, 'no valid video urls parsed out')
        const adaptiveFormatData = JSON.parse('{' + adaptiveFormatsExecResult[0] + '}')
        parsedInfo.hasAdaptive = false
        for (const data of adaptiveFormatData.adaptiveFormats) {
            if (!data.url && !data.signatureCipher)
                continue
            const format = new FormatInfo()
            format.itag = data.itag
            format.url = data.url ? data.url : decipherSignature(html5player, data.signatureCipher)
            format.mimeType = data.mimeType

            const typeExecResult: RegExpExecArray = matchOne(MIMETYPE_RE, data.mimeType)
            format.type = typeExecResult[1]
            format.subType = typeExecResult[2]
            if (typeExecResult[3].startsWith('vp9')) {
                format.codecs = 'vp9'
            } else if (typeExecResult[3].startsWith('av01')) {
                format.codecs = 'av1'
            } else if (typeExecResult[3].startsWith('avc')) {
                format.codecs = 'avc'
            } else if (typeExecResult[3].startsWith('opus')) {
                format.codecs = 'opus'
            } else if (typeExecResult[3].startsWith('mp4a')) {
                format.codecs = 'mp4a'
            } else { // ac-3 for example.
                continue;
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

        if (!parsedInfo.hasMultiplexed && !parsedInfo.hasAdaptive) {
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
            
            parsedInfo.multiplexedFormats = parsedInfo.multiplexedFormats.sort((a: FormatInfo, b: FormatInfo) => {
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
        const urlComponents = new URL(decodeURIComponent(url))
        urlComponents.searchParams.set('bpctr', '9999999999')
        urlComponents.searchParams.set('has_verified', '1')
        const processedURL = urlComponents.toString()
        
        const rawData: string = await requestPage(processedURL)

        const html5playerUrl = this.host + matchOne(HTML5PLAYER_RE, rawData, 'no html5 player found')[1]
        const html5player: string = await requestPage(html5playerUrl)

        const parsedInfo = new YouTubeParsedInfo()
        parsedInfo.url = url
        const setting: Setting = readSetting()
        parsedInfo.location = setting.location

        try {
            await this.parseFormatInfo(parsedInfo, rawData, html5player)
        } catch (e: any) {
            Log.infoLog(rawData)
            throw e
        }
        
        parsedInfo.selection = new Selection()
        if (parsedInfo.hasMultiplexed) {
            parsedInfo.selection.selectedMultiplexedFormat = parsedInfo.multiplexedFormats[0]
        }
        if (parsedInfo.hasAdaptive) {
            parsedInfo.selection.selectedVideoFormat = {...parsedInfo.videoFormats[0]}
            parsedInfo.selection.selectedAudioFormat = {...parsedInfo.audioFormats[0]}
        }
        return parsedInfo
    }
    
    DownloadOptions = ({ parsedInfo, handleInfoChange }: 
        { parsedInfo: YouTubeParsedInfo, handleInfoChange: React.ChangeEventHandler<HTMLElement> }): React.ReactElement => {
        return (
            <React.Fragment>
                <DownloadOptionsBase parsedInfo={parsedInfo} handleInfoChange={handleInfoChange} />
                {(() => {
                    if (parsedInfo.hasAdaptive === false) {
                        return (
                            <InfoRow>
                                <label>Quality</label>
                                <select className="format-selecter" value={parsedInfo.selection.selectedMultiplexedFormat?.quality} 
                                    name='selection-selectedMultiplexedQuality' onChange={handleInfoChange}>
                                    {parsedInfo.multiplexedFormats.map((format: FormatInfo, index: number, _array: Array<FormatInfo>) => 
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
                                    <select className="format-selecter" value={parsedInfo.selection.selectedVideoFormat?.quality} 
                                        name='selection-selectedVideoFormat-quality' onChange={handleInfoChange}>
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
                                    <select className="format-selecter" value={parsedInfo.selection.selectedVideoFormat?.codecs} 
                                        name='selection-selectedVideoFormat-codecs' onChange={handleInfoChange}>
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
                                    <select className="format-selecter" value={parsedInfo.selection.selectedAudioFormat?.quality} 
                                        name='selection-selectedAudioFormat-quality' onChange={handleInfoChange}>
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
                                    <select className="format-selecter" value={(parsedInfo.selection.selectedAudioFormat as FormatInfo).codecs} 
                                        name='selection-selectedAudioFormat-codecs' onChange={handleInfoChange}>
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

    addTask = async (parsedInfo: YouTubeParsedInfo): Promise<void> => {
        if (parsedInfo.hasAdaptive === false) {
            let videoFormat: FormatInfo = parsedInfo.videoFormats[0]
            for (const format of parsedInfo.videoFormats) {
                if (format.quality === parsedInfo.selection.selectedMultiplexedFormat?.quality) {
                    videoFormat = format
                    break
                }
            }
            const preflightParsedInfo: PreflightInfo = await preflight(videoFormat.url, this.requestHeaders)
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
            videoTask.extractorNo = this.extractorNo

            ipcRenderer.send(CommunicateAPIName.AddTask, videoTask)
        } else {
            let videoFormat: FormatInfo = parsedInfo.videoFormats[0]
            for (const format of parsedInfo.videoFormats) {
                if (format.quality === parsedInfo.selection.selectedVideoFormat?.quality && format.codecs === parsedInfo.selection.selectedVideoFormat?.codecs) {
                    videoFormat = format
                    break
                }
            }
            let preflightParsedInfo: PreflightInfo = await preflight(videoFormat.url, this.requestHeaders)
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
            videoTask.extractorNo = this.extractorNo
    
            let audioFormat: FormatInfo = parsedInfo.audioFormats[0]
            for (const format of parsedInfo.audioFormats) {
                if (format.quality === parsedInfo.selection.selectedAudioFormat?.quality && format.codecs === parsedInfo.selection.selectedAudioFormat?.codecs) {
                    audioFormat = format
                    break
                }
            }

            preflightParsedInfo = await preflight(audioFormat.url, this.requestHeaders)

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
            audioTask.extractorNo = this.extractorNo
    
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
            taskSet.extractorNo = this.extractorNo
    
            ipcRenderer.send(CommunicateAPIName.AddTaskSet, [taskSet, [videoTask, audioTask]])
        }
    }
}

export default YouTubeParser
export { FormatInfo }