import { AxiosResponse } from 'axios'
import * as React from 'react'
import { readSetting, writeSetting } from '../setting'

import DefaultParser from './default_parser'
import BiliBiliParser from './bilibili_parser'
import YoutubeParser from './youtube_parser'

interface Parser {
    parserNo: number
    parseTarget: string
    getParserTarget(): string
    parse(url: string): Promise<[AxiosResponse, string]>
    parseUrlInfo(url: string, downloadUrl: string, statusCode: number, headers: {[key: string]: string}, setting: {[key: string]: any}): {[key: string]: any}
    getDownloadOptions({ parsedInfo, handleInfoChange} : 
        { parsedInfo: {[key: string]: any}, handleInfoChange: React.ChangeEventHandler<HTMLInputElement>}): React.ReactElement
    addTask(parsedInfo: {[key: string]: any}): void,
    downloadHeaders?: {[key: string]: any}, // for tasks non-default parsers have parsed out to use when download
    callback?: Function // a Parser may require a callback function only when it parse out a TaskSet
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
            if (parser.getParserTarget() === selection.getParserTarget()) {
                this.index = index
            }
        })
    },
    async parse(url: string): Promise<{[key: string]: any}> {
        const [res, downloadUrl] = await this.choosenParser.parse(url)
        const parsedInfo: {[key: string]: any} = this.choosenParser.parseUrlInfo(url, downloadUrl, res.status, res.headers, readSetting())
        return parsedInfo
    },
    getDownloadOptions(parsedInfo: {[key: string]: any}, handleInfoChange: React.ChangeEventHandler<HTMLInputElement>): React.ReactElement {
        return this.choosenParser.getDownloadOptions({parsedInfo, handleInfoChange})
    },
    addTask(parsedInfo: {[key: string]: any}): void {
        this.choosenParser.addTask(parsedInfo)
    }
}


export default parsers
export { Parser, parserModule }

