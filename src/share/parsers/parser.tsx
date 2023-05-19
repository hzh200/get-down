import * as http from 'node:http'
import * as React from 'react'
import { EventEmitter } from 'node:stream'
import { Task, TaskSet } from '../models'
import InfoRow from './InfoRow'

interface Parser {
    parserNo: number
    parseTarget: string
    requestHeaders?: http.OutgoingHttpHeaders
    // downloadHeaders: http.OutgoingHttpHeaders
    parse(url: string): Promise<ParsedInfo>
    DownloadOptions({ parsedInfo, handleInfoChange} : 
        { parsedInfo: ParsedInfo, handleInfoChange: React.ChangeEventHandler<HTMLElement>}): React.ReactElement
    addTask(parsedInfo: ParsedInfo): void
    taskCallback?(mainEventEmitter: EventEmitter, taskNo: number): Promise<void> // // for main process only.
    taskSetCallback?(mainEventEmitter: EventEmitter, taskNo: number): Promise<void> // a Parser may require a callback function only when it parses out a TaskSet
}

// common parsed info.
class ParsedInfo {
    name: string
    location: string
}

// for combination of advanced components.
const DownloadOptionsBase = ({ parsedInfo, handleInfoChange }: 
    { parsedInfo: ParsedInfo, handleInfoChange: React.ChangeEventHandler<HTMLElement> }): React.ReactElement => {
    return (
        <React.Fragment>
            <InfoRow>
                <label>File name:</label>
                <input className="resource-name" type="text" value={parsedInfo.name} name='name' onChange={handleInfoChange} />
            </InfoRow>
            <InfoRow>
                <label>Location:</label>
                <input className="download-location" type="text" value={parsedInfo.location} name='location' onChange={handleInfoChange} />
            </InfoRow>
            {/* <InfoRow>
                <label>Use proxy? </label>
                <input className="use-proxy" type="checkbox" checked={parsedInfo.useProxy} name='useProxy' onChange={handleInfoChange} />
            </InfoRow> */}
        </React.Fragment>
    )
}

export { Parser, ParsedInfo, DownloadOptionsBase }