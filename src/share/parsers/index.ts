import * as React from 'react'
import { Parser, ParsedInfo } from './parser'
import DefaultParser from './default_parser'
import BiliBiliParser from './bilibili_parser'
import YoutubeParser from './youtube_parser'

const parsers: Array<Parser> = [
    new DefaultParser(),
    new BiliBiliParser(),
    new YoutubeParser()
]

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
    getParser(index: number): Parser {
        return parsers[index]
    },
    choose(selection: Parser): void {
        parsers.forEach((parser, index) => {
            if (parser.parseTarget === selection.parseTarget) {
                this.index = index
            }
        })
    },
    async parse(url: string): Promise<ParsedInfo> {
        const parsedInfo: ParsedInfo = await this.choosenParser.parse(url)
        return parsedInfo
    },
    getDownloadOptions(parsedInfo: ParsedInfo, handleInfoChange: React.ChangeEventHandler<HTMLInputElement>): React.ReactElement {
        return this.choosenParser.DownloadOptions({parsedInfo, handleInfoChange})
    },
    async addTask(parsedInfo: ParsedInfo): Promise<void> {
        await this.choosenParser.addTask(parsedInfo)
    }
}

export default parserModule

