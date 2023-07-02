import * as React from 'react'
import './url_bar.css'
import DefaultParser from '../../../share/extractors//default/default_parser'

function UrlBar({ parserNames, choosenParserName, handleParserChange, url, handleUrlChange, parseUrl, handleAdditionalInfoChange }: 
    { parserNames: Array<string>, choosenParserName: string, handleParserChange: React.ChangeEventHandler<HTMLSelectElement>, 
        url: string, handleUrlChange: React.ChangeEventHandler<HTMLInputElement>, parseUrl: React.MouseEventHandler<HTMLButtonElement>,
        handleAdditionalInfoChange: (name: string, value: any) => void }) {
    const [useCustomInfo, setUseCustomInfo] = React.useState<boolean>(false);
    const [customHeaders, setCustomHeaders] = React.useState<Array<[string, string]>>([]);

    const handleUseCustomInfoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setUseCustomInfo(event.target.checked);
        // if (customHeaders.length === 0) {
        //     setCustomHeaders([['', '']]);
        // }
        if (!event.target.checked) {
            handleAdditionalInfoChange('*', null);
            setCustomHeaders([]);
        }
    };

    const handleCustomHeadersAdd = () => {
        customHeaders.push(['', '']);
        setCustomHeaders([...customHeaders]);
    };
    const handleCustomHeadersChange = (event: React.ChangeEvent<HTMLInputElement>, index: number, part: number) => {
        customHeaders[index][part]  = event.target.value;
        setCustomHeaders([...customHeaders]);
        const headerObject: {[key: string]: any} = {};
        for (const header of customHeaders.filter(((value, index, _array) => value[0] !== '' && value[1] !== ''))) {
            headerObject[header[0]] = header[1];
        }
        handleAdditionalInfoChange('customHeaders', headerObject);
    };

    return (
        <React.Fragment>
            <div className="url-bar">
                <select className="url-bar-name-selecter" value={choosenParserName} onChange={handleParserChange}>
                    {parserNames.map(
                        (parserName: string, index: number, _array: Array<string>) => 
                            <option value={parserName} key={index}>{parserName}</option>
                    )}
                </select>
                <input className="url-bar-text-input" type="text" value={url} onChange={handleUrlChange} />
                <button className="url-bar-access-button" onClick={parseUrl}>Go</button>
            </div>
            {choosenParserName === (new DefaultParser()).extractTarget ? (
                <div className='additional-info-bar'>
                    <label>Use custom headers:</label>
                    <input type='checkbox' className='additional-info-bar-checkbox' checked={useCustomInfo} onChange={handleUseCustomInfoChange} />
                    {useCustomInfo ? 
                        <React.Fragment>
                            <button className='additional-info-bar-add-header' onClick={handleCustomHeadersAdd}>Add Header</button>
                            {customHeaders.map((value, index, _array) => 
                                <div className='additional-info-bar-header' key={index}>
                                    <label>name:</label>
                                    <input type='text' className='additional-info-bar-header-name' value={value[0]} onChange={(event) => handleCustomHeadersChange(event, index, 0)} />
                                    <label>value:</label>
                                    <input type='text' className='additional-info-bar-header-value' value={value[1]} onChange={(event) => handleCustomHeadersChange(event, index, 1)} />
                                </div>)
                            }
                        </React.Fragment> 
                    : <></>}
                </div>
            ) : <></>}
        </React.Fragment>
    );
}

export default UrlBar;