import * as React from 'react'
import * as http from 'http'
import { Parser } from './index'
import { InfoRow } from '../../renderer/interface/parserPage/statusPanel'

import { Task } from '../../common/models'
import { handlePromise } from '../../common/utils'
import { Setting } from '../setting'
import { ParsedInfo, preflight } from '../../common/http/preflight'
import { ipcRenderer } from 'electron'
import { CommunicateAPIName } from '../communicate'

class DefaultParsedInfo extends ParsedInfo {
    declare name: string
    declare size: number | undefined
    declare type: string
    declare url: string
    declare createAt: string
    declare downloadUrl: string
    declare subType: string
    declare charset: string | undefined
    declare isRange: boolean
    // status: string
    // progress: number
    // updateAt: string
    // downloadRanges: Array<Array<number>>
    location: string
    parent: number | undefined
}

class DefaultParser implements Parser {
    parserNo: number = 0
    parseTarget: string = 'default'
    getParserNo = (): number => this.parserNo
    getParserTarget = (): string => this.parseTarget

    parse = async (url: string, preflightParsedInfo: ParsedInfo, setting: Setting): Promise<DefaultParsedInfo> => {
        const parsedInfo = new DefaultParsedInfo()
        parsedInfo.name = preflightParsedInfo.name
        parsedInfo.size = preflightParsedInfo.size
        parsedInfo.type = preflightParsedInfo.type
        parsedInfo.url = preflightParsedInfo.url
        parsedInfo.createAt = preflightParsedInfo.createAt
        parsedInfo.downloadUrl = preflightParsedInfo.downloadUrl
        parsedInfo.subType = preflightParsedInfo.subType
        parsedInfo.charset = preflightParsedInfo.charset
        parsedInfo.isRange = preflightParsedInfo.isRange
        parsedInfo.location = setting.location
        // parsedInfo.parent
        return parsedInfo
    }

    downloadOptions = ({ parsedInfo, handleInfoChange } : 
        { parsedInfo: DefaultParsedInfo, handleInfoChange: React.ChangeEventHandler<HTMLInputElement> }): React.ReactElement => {
        return (
            <React.Fragment>
                <InfoRow>
                    <label>File name: </label>
                    <input className="resource-name" type="text" value={parsedInfo.name} name='name' onChange={handleInfoChange} />
                </InfoRow>
                <InfoRow>
                    <label>Location: </label>
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

    addTask = (parsedInfo: DefaultParsedInfo): void => {
        const task = new Task()
        task.name = parsedInfo.name
        task.size = parsedInfo.size
        task.type = parsedInfo.type
        task.url = parsedInfo.url
        task.downloadUrl = parsedInfo.downloadUrl
        task.createAt = parsedInfo.createAt
        task.subType = parsedInfo.subType
        task.charset = parsedInfo.charset
        task.location = parsedInfo.location
        task.isRange = parsedInfo.isRange
        task.parserNo = this.parserNo
        ipcRenderer.send(CommunicateAPIName.AddTask, task)
    }
}

export default DefaultParser
export { DefaultParsedInfo }