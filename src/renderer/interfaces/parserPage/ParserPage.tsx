import * as React from 'react'
import UrlBar from '../../components/UrlBar'
import StatusPanel, { ParserStatus } from '../../components/StatusPanel'

import { parserModule } from '../../../share/parsers'
import { handlePromise } from '../../../share/utils'
import { DefaultParsedInfo } from '../../../share/parsers/default_parser'
import { validateUrl } from '../../../share/http/validation'


function ParserPage() {
    const [parserNames, setParserNames] = React.useState<Array<string>>([])
    const [url, set] = React.useState<string>('')
    const [choosenParserName, setChoosenParserName] = React.useState<string>(parserModule.defaultParser.parseTarget)
    const [status, setStatus] = React.useState<ParserStatus>(ParserStatus.static)
    const [optionsInfo, setOptionsInfo] = React.useState<DefaultParsedInfo>(new DefaultParsedInfo())
    const [errorMessage, setErrorMessage] = React.useState<string>('')
    React.useEffect(() => {
        for (const parser of parserModule.parsers) {
            setParserNames((parsers) => [...parsers, parser.parseTarget])
        }
    }, [])
    const handleParserChange: React.ChangeEventHandler<HTMLSelectElement> = (event: React.ChangeEvent<HTMLSelectElement>): void => {
        for (const parser of parserModule.parsers) {
            if (parser.parseTarget === (event.target as HTMLSelectElement).value) {
                parserModule.choose(parser)
                setChoosenParserName(parser.parseTarget)
            }
        }
    }
    const handleUrlChange: React.ChangeEventHandler<HTMLInputElement> = (event: React.ChangeEvent<HTMLInputElement>): void => {
        set((event.target as HTMLInputElement).value)
    }
    const parseUrl: React.MouseEventHandler<HTMLButtonElement> = async (): Promise<void> => {
        setStatus(ParserStatus.parsing)
        if (!validateUrl(url)) {
            setStatus(ParserStatus.failed)
            // setOptionsInfo(new DefaultParsedInfo())
            setErrorMessage('Unsupported Protocol')
            return
        }
        const [error, parsedInfo]: [Error | undefined, DefaultParsedInfo] = await handlePromise<DefaultParsedInfo>(parserModule.parse(url))
        if (error) {
            setStatus(ParserStatus.failed)
            // setOptionsInfo(new DefaultParsedInfo())
            setErrorMessage(error.toString())
            return
        }
        setOptionsInfo(parsedInfo)
        setStatus(ParserStatus.succeed)
        setErrorMessage('')
    }
    const handleInfoPanelChange: React.ChangeEventHandler<HTMLInputElement> = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const target: HTMLInputElement = event.target as HTMLInputElement
        const value: string | boolean = target.type === 'checkbox' ? target.checked : target.value
        const name: string = target.name
        setOptionsInfo(parsedInfo => ({
            ...parsedInfo,
            ...{
                [name]: value
            }
        }))
        // const newInfo: any = {}
        // Object.assign(newInfo, parsedInfo)
    }
    const download: React.MouseEventHandler<HTMLButtonElement> = async () => {
        if (optionsInfo) {
            parserModule.addTask(optionsInfo)
        }
    }
    return (
        <div className='parser-page'>
            <UrlBar parserNames={parserNames} choosenParserName={choosenParserName} handleParserChange={handleParserChange}
                url={url} handleUrlChange={handleUrlChange} parseUrl={parseUrl} />
            <StatusPanel status={status} parsedInfo={optionsInfo} handleInfoPanelChange={handleInfoPanelChange} errorMessage={errorMessage} downloadUrl={download} />
        </div>
    )
}

export default ParserPage
export { ParserStatus }