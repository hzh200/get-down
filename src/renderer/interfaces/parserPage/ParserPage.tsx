import * as React from 'react'
import UrlBar from '../../components/UrlBar'
import StatusPanel, { ParserStatus } from '../../components/StatusPanel'
import parserModule from '../../../share/parsers'
import { Log, handlePromise } from '../../../share/utils'
import { ParsedInfo } from '../../../share/parsers/parser'
import { validateUrl } from '../../../share/http/util'
import { getTranslatedFilename } from '../../../share/utils'

import './parser_page.css'

function ParserPage() {
    const [parserNames, setParserNames] = React.useState<Array<string>>([])
    const [url, setUrl] = React.useState<string>('')
    // Every time ParserPage is closed and reopened, states are reset, choosenParserName should be initialized from choosenParser of parserModule.
    const [choosenParserName, setChoosenParserName] = React.useState<string>(parserModule.choosenParser.parseTarget) 
    const [status, setStatus] = React.useState<ParserStatus>(ParserStatus.static)
    const [optionsInfo, setOptionsInfo] = React.useState<ParsedInfo>(new ParsedInfo())
    const [errorMessage, setErrorMessage] = React.useState<string>('')
    const [feedbackMessage, setFeedbackMessage] = React.useState<string>('')
    React.useEffect(() => {
        for (const parser of parserModule.parsers) {
            setParserNames((parsers) => [...parsers, parser.parseTarget])
        }
    }, [])
    const handleParserChange: React.ChangeEventHandler<HTMLSelectElement> = (event: React.ChangeEvent<HTMLSelectElement>): void => {
        for (const parser of parserModule.parsers) {
            if (parser.parseTarget === (event.target as HTMLSelectElement).value) {
                parserModule.choose(parser)
                setStatus(ParserStatus.static)
                setChoosenParserName((_parserName: string) => parser.parseTarget)
            }
        }
    }
    const handleUrlChange: React.ChangeEventHandler<HTMLInputElement> = (event: React.ChangeEvent<HTMLInputElement>): void => {
        setUrl((event.target as HTMLInputElement).value)
    }
    const parseUrl: React.MouseEventHandler<HTMLButtonElement> = async (): Promise<void> => {
        setStatus(ParserStatus.parsing)
        if (!validateUrl(url)) {
            setStatus(ParserStatus.failed)
            setErrorMessage('Unsupported Protocol')
            return
        }
        const [error, parsedInfo]: [Error | undefined, ParsedInfo] = await handlePromise<ParsedInfo>(parserModule.parse(url))
        if (error) {
            setStatus(ParserStatus.failed)
            // setOptionsInfo(new DefaultParsedInfo())
            setErrorMessage(error.name + ':' + error.message)
            if (error.stack) {
                Log.errorLog(error.stack)
            }
            return
        }
        parsedInfo.name = getTranslatedFilename(parsedInfo.name)
        setOptionsInfo(parsedInfo)
        setStatus(ParserStatus.succeed)
        setErrorMessage('')
        setFeedbackMessage('')
    }
    const handleInfoPanelChange: React.ChangeEventHandler<HTMLInputElement> = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const elementTarget: HTMLInputElement = event.target as HTMLInputElement
        const targetName: string = elementTarget.name
        const targetValue: string | boolean = elementTarget.type === 'checkbox' ? elementTarget.checked : elementTarget.value

        const names: Array<string> = targetName.split('-')
        let optionTarget: any = optionsInfo
        let parentTarget: any = undefined
        const setProperty = (nameIndex: number): void => {
            if (nameIndex === names.length || typeof optionTarget[names[nameIndex]] === 'undefined') {
                return
            }
            parentTarget = optionTarget
            if (parentTarget instanceof Array) {
                optionTarget = parentTarget[parseInt(names[nameIndex])]
            } else if (parentTarget instanceof Map) {
                optionTarget = parentTarget.get(names[nameIndex])
            } else if (typeof parentTarget === 'object') {
                optionTarget = parentTarget[names[nameIndex]]
            }
            if (typeof optionTarget === 'object') {
                setProperty(nameIndex + 1)
            } else {
                if (parentTarget instanceof Array) {
                    parentTarget[parseInt(names[nameIndex])] = targetValue
                } else if (parentTarget instanceof Map) {
                    parentTarget.set(names[nameIndex], targetValue)
                } else if (typeof parentTarget === 'object') {
                    parentTarget[names[nameIndex]] = targetValue
                }
            }
        }
        setProperty(0)
        setOptionsInfo(optionsInfo => ({...optionsInfo}))
        // const newInfo: any = {}
        // Object.assign(newInfo, parsedInfo)
    }
    const download: React.MouseEventHandler<HTMLButtonElement> = async () => {
        if (optionsInfo) {
            setFeedbackMessage('adding task/tasks')
            setErrorMessage('')
            try {
                await parserModule.addTask(optionsInfo)
                setFeedbackMessage('add task/tasks succeed')
                setErrorMessage('')
            } catch (error: any) {
                setFeedbackMessage('')
                setErrorMessage(error.name + ':' + error.message)
            }
        }
    }
    return (
        <div className='parser-page'>
            <UrlBar parserNames={parserNames} choosenParserName={choosenParserName} handleParserChange={handleParserChange}
                url={url} handleUrlChange={handleUrlChange} parseUrl={parseUrl} />
            <StatusPanel status={status} optionsInfo={optionsInfo} handleInfoPanelChange={handleInfoPanelChange} errorMessage={errorMessage} feedbackMessage={feedbackMessage} downloadUrl={download} />
        </div>
    )
}

export default ParserPage
export { ParserStatus }