import * as React from 'react'
import UrlBar from './urlBar'
import StatusPanel from './statusPanel'

import { parserModule } from '../../../common/parsers'
import { handlePromise } from '../../../common/utils'

enum ParserStatus {
    static,
    parsing,
    succeed,
    failed
}

function ParserPage() {
    const [parserNames, setParserNames] = React.useState<Array<string>>([])
    const [url, setUrl] = React.useState<string>('')
    const [choosenParserName, setChoosenParserName] = React.useState<string>(parserModule.defaultParser.getParserTarget())
    const [status, setStatus] = React.useState<ParserStatus>(ParserStatus.static)
    const [optionsInfo, setOptionsInfo] = React.useState<{[key: string]: any} | null>(null)
    const [errorMessage, setErrorMessage] = React.useState<string>('')
    React.useEffect(() => {
        for (const parser of parserModule.parsers) {
            setParserNames((parsers) => [...parsers, parser.getParserTarget()])
        }
    }, [])
    const handleParserChange: React.ChangeEventHandler<HTMLSelectElement> = (event: React.ChangeEvent<HTMLSelectElement>): void => {
        for (const parser of parserModule.parsers) {
            if (parser.getParserTarget() === (event.target as HTMLSelectElement).value) {
                parserModule.choose(parser)
                setChoosenParserName(parser.getParserTarget())
            }
        }
    }
    const handleUrlChange: React.ChangeEventHandler<HTMLInputElement> = (event: React.ChangeEvent<HTMLInputElement>): void => {
        setUrl((event.target as HTMLInputElement).value)
    }
    const parseUrl: React.MouseEventHandler<HTMLButtonElement> = async (): Promise<void> => {
        setStatus(ParserStatus.parsing)
        const [error, parsedInfo] = await handlePromise<{
            [key: string]: any;
        }>(parserModule.parse(url))
        if (error) {
            setStatus(ParserStatus.failed)
            setOptionsInfo(null)
            setErrorMessage(error.toString())
            return
        }
        setOptionsInfo(parsedInfo as {
            [key: string]: any;
        })
        setStatus(ParserStatus.succeed)
        setErrorMessage('')
    }
    const handleInfoPanelChange: React.ChangeEventHandler<HTMLInputElement> = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const target: HTMLInputElement = event.target as HTMLInputElement
        const value: string | boolean = target.type === 'checkbox' ? target.checked : target.value
        const name: string = target.name
        setOptionsInfo(parsedInfo => ({ // not a ExtractTaskInfo anymore
            ...parsedInfo,
            ...{
                [name]: value
            }
        }))
        // const newInfo: any = {}
        // Object.assign(newInfo, parsedInfo)
    }
    const downloadUrl: React.MouseEventHandler<HTMLButtonElement> = async () => {
        if (optionsInfo) {
            parserModule.addTask(optionsInfo)
        }
    }
    return (
        <div className='parser-page'>
            <UrlBar parserNames={parserNames} choosenParserName={choosenParserName} handleParserChange={handleParserChange}
                url={url} handleUrlChange={handleUrlChange} parseUrl={parseUrl} />
            <StatusPanel status={status} parsedInfo={optionsInfo as {[key: string]: any}} handleInfoPanelChange={handleInfoPanelChange} errorMessage={errorMessage} downloadUrl={downloadUrl} />
        </div>
    )
}

export default ParserPage
export { ParserStatus }