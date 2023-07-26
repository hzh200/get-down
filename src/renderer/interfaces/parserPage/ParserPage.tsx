import * as React from 'react';
import UrlBar from '../../components/UrlBar';
import StatusPanel, { ParserStatus } from '../../components/StatusPanel';
import parserModule, { ParsedInfo } from '../../../share/extractors/parsers';
import { Log, handlePromise } from '../../../share/utils';
import { validateUrl } from '../../../share/http/util';
import { getUnescapedFilename } from '../../../share/utils';

import './parser_page.css';

function ParserPage() {
    const [parserNames, setParserNames] = React.useState<Array<string>>([]);
    // Every time ParserPage is closed and reopened, states are reset, choosenParserName should be initialized from choosenParser of parserModule.
    const [choosenParserName, setChoosenParserName] = React.useState<string>(parserModule.choosenParser.extractTarget);
    const [url, setUrl] = React.useState<string>('');
    const [additionalInfo, setAdditionalInfo] = React.useState<{ [key: string]: any }>({ customHeaders: undefined });
    const [status, setStatus] = React.useState<ParserStatus>(ParserStatus.static);
    const [optionsInfo, setOptionsInfo] = React.useState<ParsedInfo>(new ParsedInfo());
    const [errorMessage, setErrorMessage] = React.useState<string>('');
    const [feedbackMessage, setFeedbackMessage] = React.useState<string>('');

    React.useEffect(() => {
        for (const parser of parserModule.parsers) {
            setParserNames((parsers) => [...parsers, parser.extractTarget]);
        }
    }, []);

    const handleParserChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
        for (const parser of parserModule.parsers) {
            if (parser.extractTarget === (event.target as HTMLSelectElement).value) {
                parserModule.choose(parser);
                setStatus(ParserStatus.static);
                setChoosenParserName((_parserName: string) => parser.extractTarget);
            }
        }
    };
    const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        setUrl((event.target as HTMLInputElement).value);
    };
    const handleAdditionalInfoChange = (name: string, value: any): void => {
        if (name === '*') {
            setAdditionalInfo({});
            return;
        }
        additionalInfo[name] = value === '' || JSON.stringify(value) === '[]' || JSON.stringify(value) === '{}' ? undefined : value;
        setAdditionalInfo({ ...additionalInfo });
    };
    const handleInfoPanelChange: React.ChangeEventHandler<HTMLInputElement> = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const elementTarget: HTMLInputElement = event.target as HTMLInputElement;
        const targetName: string = elementTarget.name;
        const targetValue: string | boolean = elementTarget.type === 'checkbox' ? elementTarget.checked : elementTarget.value;

        const names: Array<string> = targetName.split('-');
        let optionTarget: any = optionsInfo;
        let parentTarget: any = undefined;
        const setProperty = (nameIndex: number): void => {
            if (nameIndex === names.length || typeof optionTarget[names[nameIndex]] === 'undefined') return;
            parentTarget = optionTarget;
            if (parentTarget instanceof Array) {
                optionTarget = parentTarget[parseInt(names[nameIndex])];
            } else if (parentTarget instanceof Map) {
                optionTarget = parentTarget.get(names[nameIndex]);
            } else if (typeof parentTarget === 'object') {
                optionTarget = parentTarget[names[nameIndex]];
            }
            if (typeof optionTarget === 'object') {
                setProperty(nameIndex + 1);
            } else {
                if (parentTarget instanceof Array) {
                    parentTarget[parseInt(names[nameIndex])] = targetValue;
                } else if (parentTarget instanceof Map) {
                    parentTarget.set(names[nameIndex], targetValue);
                } else if (typeof parentTarget === 'object') {
                    parentTarget[names[nameIndex]] = targetValue;
                }
            }
        };
        setProperty(0);
        setOptionsInfo(optionsInfo => ({ ...optionsInfo }));
    };

    const parseUrl: React.MouseEventHandler<HTMLButtonElement> = async (): Promise<void> => {
        setStatus(ParserStatus.parsing);
        Log.info(`Parsing url: ${url}`);
        if (!validateUrl(url)) {
            setStatus(ParserStatus.failed);
            setErrorMessage('Unsupported Protocol');
            return;
        }
        try {
            const parsedInfo = await parserModule.parse(url, additionalInfo['customHeaders'] ? additionalInfo['customHeaders'] : undefined);
            parsedInfo.name = getUnescapedFilename(parsedInfo.name);
            setOptionsInfo(parsedInfo);
            setStatus(ParserStatus.succeed);
            setErrorMessage('');
            setFeedbackMessage('');
        } catch (error: any) {
            setStatus(ParserStatus.failed);
            // setOptionsInfo(new DefaultParsedInfo());
            setErrorMessage(error.name + ':' + error.message);
            if (error.stack) {
                Log.error(error.stack);
            }
        }
    };
    const download: React.MouseEventHandler<HTMLButtonElement> = async () => {
        if (optionsInfo) {
            setFeedbackMessage('adding task/tasks');
            setErrorMessage('');
            try {
                await parserModule.addTask(optionsInfo, JSON.stringify(additionalInfo) !== '{}' ? additionalInfo : undefined);
                setFeedbackMessage('add task/tasks succeed');
                setErrorMessage('');
            } catch (error: any) {
                setFeedbackMessage('');
                setErrorMessage(error.name + ':' + error.message);
                Log.error(error.stack);
            }
        }
    };

    return (
        <div className='parser-page'>
            <UrlBar parserNames={parserNames} choosenParserName={choosenParserName} handleParserChange={handleParserChange}
                url={url} handleUrlChange={handleUrlChange} parseUrl={parseUrl} handleAdditionalInfoChange={handleAdditionalInfoChange} />
            <StatusPanel status={status} optionsInfo={optionsInfo} handleInfoPanelChange={handleInfoPanelChange} errorMessage={errorMessage}
                feedbackMessage={feedbackMessage} downloadUrl={download} />
        </div>
    );
}

export default ParserPage;
export { ParserStatus };