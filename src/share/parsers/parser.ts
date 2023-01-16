import * as http from 'node:http'

interface Parser {
    parserNo: number
    parseTarget: string
    requestHeaders?: http.OutgoingHttpHeaders
    // downloadHeaders: http.OutgoingHttpHeaders
    parse(url: string): Promise<ParsedInfo>
    DownloadOptions({ parsedInfo, handleInfoChange} : 
        { parsedInfo: ParsedInfo, handleInfoChange: React.ChangeEventHandler<HTMLInputElement>}): React.ReactElement
    addTask(parsedInfo: ParsedInfo): void
    callback?(): void // a Parser may require a callback function only when it parse out a TaskSet
}

class ParsedInfo {
    name: string
    location: string
}

export { Parser, ParsedInfo }