import * as React from 'react'
import * as http from 'http'
import { Parser, ParsedInfo, DownloadOptionsBase } from '../interfaces/parser'
import InfoRow from '../InfoRow'
import { PreflightInfo, preflight } from '../../http/functions'

import { Task, DownloadType } from '../../global/models'
import { Setting, readSetting } from '../../utils'
import { ipcRenderer } from 'electron'
import { CommunicateAPIName } from '../../global/communication'
import Default from './default'

class DefaultParsedInfo extends ParsedInfo {
    declare name: string
    size: number | undefined
    type: string
    url: string
    publishedTimestamp: string
    downloadUrl: string
    subType: string
    charset: string | undefined
    downloadType: DownloadType
    // status: string
    // progress: number
    // updatedAt: string
    // downloadRanges: Array<Array<number>>
    declare location: string
    parent: number | undefined
}

class DefaultParser extends Default implements Parser {
    parse = async (url: string, additionHeaders?: http.OutgoingHttpHeaders): Promise<ParsedInfo> => {
        const setting: Setting = readSetting()
        const preflightParsedInfo: PreflightInfo = await preflight(url, additionHeaders)
        const parsedInfo = new DefaultParsedInfo()
        parsedInfo.name = preflightParsedInfo.name
        parsedInfo.size = preflightParsedInfo.size
        parsedInfo.type = preflightParsedInfo.type
        parsedInfo.url = preflightParsedInfo.url
        parsedInfo.publishedTimestamp = preflightParsedInfo.publishedTimestamp
        parsedInfo.downloadUrl = preflightParsedInfo.downloadUrl
        parsedInfo.subType = preflightParsedInfo.subType
        parsedInfo.charset = preflightParsedInfo.charset
        parsedInfo.downloadType = preflightParsedInfo.downloadType
        parsedInfo.location = setting.location
        // parsedInfo.parent
        return parsedInfo
    }

    DownloadOptions = ({ parsedInfo, handleInfoChange }: 
        { parsedInfo: DefaultParsedInfo, handleInfoChange: React.ChangeEventHandler<HTMLElement> }): React.ReactElement => {
        return (
            <React.Fragment>
                <DownloadOptionsBase parsedInfo={parsedInfo} handleInfoChange={handleInfoChange} />
                <InfoRow>
                    <label>{parsedInfo.size ? parsedInfo.size : ''}</label>
                </InfoRow>
            </React.Fragment>
        )
    }

    addTask = async (parsedInfo: DefaultParsedInfo, additionalInfo?: string): Promise<void> => {
        const task = new Task()
        task.name = parsedInfo.name
        task.size = parsedInfo.size
        task.type = parsedInfo.type
        task.url = parsedInfo.url
        task.downloadUrl = parsedInfo.downloadUrl
        task.publishedTimestamp = parsedInfo.publishedTimestamp
        task.subType = parsedInfo.subType
        task.charset = parsedInfo.charset
        task.location = parsedInfo.location
        task.downloadType = parsedInfo.downloadType
        task.extractorNo = this.extractorNo
        task.additionalInfo = additionalInfo;
        ipcRenderer.send(CommunicateAPIName.AddTask, task)
    }
}

export default DefaultParser
export { DefaultParsedInfo }