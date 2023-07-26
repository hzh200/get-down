import * as React from 'react';
import * as http from 'node:http';
import ExtractorInfo from './interfaces/extractorInfo';
import { Parser, ParsedInfo } from './interfaces/parser';
import DefaultParser from './default/default_parser';
import BiliBiliParser from './bilibili/bilibili_parser';
import YouTubeParser from './youtube/youtube_parser';

const parsers: Array<Parser> = [
    new DefaultParser(),
    new BiliBiliParser(),
    new YouTubeParser()
];

const parserModule = {
    index: 0,
    get parsers(): Array<Parser> {
        return parsers;
    },
    get defaultParser(): Parser {
        return parsers[0];
    },
    get choosenParser(): Parser {
        return parsers[this.index];
    },
    getParser(index: number): Parser {
        return parsers[index];
    },
    choose(selection: Parser): void {
        parsers.forEach((parser, index) => {
            if (parser.extractTarget === selection.extractTarget) {
                this.index = index;
            }
        });
    },
    async parse(url: string, additionHeaders?: http.OutgoingHttpHeaders): Promise<ParsedInfo> {
        const parsedInfo: ParsedInfo = await this.choosenParser.parse(url, additionHeaders);
        return parsedInfo;
    },
    getDownloadOptions(parsedInfo: ParsedInfo, handleInfoChange: React.ChangeEventHandler<HTMLInputElement>): React.ReactElement {
        return this.choosenParser.DownloadOptions({ parsedInfo, handleInfoChange });
    },
    async addTask(parsedInfo: ParsedInfo, additionalInfo?: { [key: string]: any }): Promise<void> {
        await this.choosenParser.addTask(parsedInfo, additionalInfo ? JSON.stringify(additionalInfo) : undefined);
    }
};

export default parserModule;
export { ExtractorInfo, Parser, ParsedInfo };