import * as React from 'react'
import * as http from 'http'
import { Parser, ParsedInfo } from './parser'
import InfoRow from './InfoRow'
import { PreflightInfo, preflight } from './preflight'

import { Task, DownloadType } from '../../share/models'
import { Setting, readSetting, handlePromise } from '../utils'
import { ipcRenderer } from 'electron'
import { CommunicateAPIName } from '../global/communication'

class DefaultParsedInfo extends ParsedInfo {
    declare name: string
    size: number | undefined
    type: string
    url: string
    createdAt: string
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

class DefaultParser implements Parser {
    parserNo: number = 0
    parseTarget: string = 'Default'

    parse = async (url: string): Promise<ParsedInfo> => {
        const setting: Setting = readSetting()
        const [err, preflightParsedInfo]: [Error | undefined, PreflightInfo] = await handlePromise<PreflightInfo>(preflight(url))
        if (err) {
            throw err
        }
        const parsedInfo = new DefaultParsedInfo()
        parsedInfo.name = preflightParsedInfo.name
        parsedInfo.size = preflightParsedInfo.size
        parsedInfo.type = preflightParsedInfo.type
        parsedInfo.url = preflightParsedInfo.url
        parsedInfo.createdAt = preflightParsedInfo.createdAt
        parsedInfo.downloadUrl = preflightParsedInfo.downloadUrl
        parsedInfo.subType = preflightParsedInfo.subType
        parsedInfo.charset = preflightParsedInfo.charset
        parsedInfo.downloadType = preflightParsedInfo.downloadType
        parsedInfo.location = setting.location
        // parsedInfo.parent
        return parsedInfo
    }

    DownloadOptions = ({ parsedInfo, handleInfoChange } : 
        { parsedInfo: DefaultParsedInfo, handleInfoChange: React.ChangeEventHandler<HTMLInputElement> }): React.ReactElement => {
        return (
            <React.Fragment>
                <InfoRow>
                    <label>File name:</label>
                    <input className="resource-name" type="text" value={parsedInfo.name} name='name' onChange={handleInfoChange} />
                </InfoRow>
                <InfoRow>
                    <label>Location:</label>
                    <input className="download-location" type="text" value={parsedInfo.location} name='location' onChange={handleInfoChange} />
                    <label>{parsedInfo.size ? parsedInfo.size : ''}</label>
                </InfoRow>
                {/* <InfoRow>
                    <label>Use proxy? </label>
                    <input className="use-proxy" type="checkbox" checked={parsedInfo.useProxy} name='useProxy' onChange={handleInfoChange} />
                </InfoRow> */}
            </React.Fragment>
        )
    }

    addTask = async (parsedInfo: DefaultParsedInfo): Promise<void> => {
        const task = new Task()
        task.name = parsedInfo.name
        task.size = parsedInfo.size
        task.type = parsedInfo.type
        task.url = parsedInfo.url
        task.downloadUrl = parsedInfo.downloadUrl
        task.createdAt = parsedInfo.createdAt
        task.subType = parsedInfo.subType
        task.charset = parsedInfo.charset
        task.location = parsedInfo.location
        task.downloadType = parsedInfo.downloadType
        task.parserNo = this.parserNo
        ipcRenderer.send(CommunicateAPIName.AddTask, task)
    }
}

export default DefaultParser
export { DefaultParsedInfo }