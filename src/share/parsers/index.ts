import * as React from 'react'
import { DefaultParsedInfo } from './default_parser'
import { Setting, readSetting } from '../utils'
import { ParsedInfo, preflight } from '../../share/http/preflight'
import { handlePromise } from '../../share/utils'

import DefaultParser from './default_parser'
import BiliBiliParser from './bilibili_parser'
import YoutubeParser from './youtube_parser'

interface Parser {
    parserNo: number
    parseTarget: string
    // requestHeaders: http.OutgoingHttpHeaders
    // downloadHeaders: http.OutgoingHttpHeaders
    parse(url: string, preflightParsedInfo: ParsedInfo, setting: Setting): Promise<DefaultParsedInfo>
    downloadOptions({ parsedInfo, handleInfoChange} : 
        { parsedInfo: {[key: string]: any}, handleInfoChange: React.ChangeEventHandler<HTMLInputElement>}): React.ReactElement
    addTask(parsedInfo: {[key: string]: any}): void
    callback?(): void // a Parser may require a callback function only when it parse out a TaskSet
}

const parsers: Array<Parser> = []
const defaultParser: Parser = new DefaultParser()
const bilibiliParser: Parser = new BiliBiliParser()
const youtubeParser: Parser = new YoutubeParser()
parsers.push(defaultParser)
parsers.push(bilibiliParser)
parsers.push(youtubeParser)

const parserModule = {
    index: 0,
    get parsers(): Array<Parser> {
        return parsers
    },
    get defaultParser(): Parser {
        return parsers[0]
    },
    get choosenParser(): Parser {
        return parsers[this.index]
    },
    choose(selection: Parser): void {
        parsers.forEach((parser, index) => {
            if (parser.parseTarget === selection.parseTarget) {
                this.index = index
            }
        })
    },
    async parse(url: string): Promise<DefaultParsedInfo> {
        const [err, preflightParsedInfo]: [Error | undefined, ParsedInfo] = await handlePromise(preflight(url))
        if (err) {
            throw err
        }
        const parsedInfo: DefaultParsedInfo = await this.choosenParser.parse(url, preflightParsedInfo, readSetting())
        return parsedInfo
    },
    getDownloadOptions(parsedInfo: DefaultParsedInfo, handleInfoChange: React.ChangeEventHandler<HTMLInputElement>): React.ReactElement {
        return this.choosenParser.downloadOptions({parsedInfo, handleInfoChange})
    },
    addTask(parsedInfo: DefaultParsedInfo): void {
        this.choosenParser.addTask(parsedInfo)
    }
}


export default parsers
export { Parser, parserModule }

