import * as React from 'react'
import './url_bar.css'

function UrlBar({ parserNames, choosenParserName, handleParserChange, url, handleUrlChange, parseUrl }: 
    { parserNames: Array<string>, choosenParserName: string, handleParserChange: React.ChangeEventHandler<HTMLSelectElement>, 
        url: string, handleUrlChange: React.ChangeEventHandler<HTMLInputElement>, parseUrl: React.MouseEventHandler<HTMLButtonElement> }) {
    return (
        <div className="url-bar">
            <select className="parser-row-name-selecter" value={choosenParserName} onChange={handleParserChange}>
                {
                    parserNames.map((parserName, index) => <option value={parserName} key={index}>{parserName}</option>)
                }
            </select>
            <input className="parser-row-text-input" type="text" value={url} onChange={handleUrlChange} />
            <button className="parser-row-access-button" onClick={parseUrl}>Go</button>
        </div>
    )
}

export default UrlBar