import * as React from 'react'
import './status_panel.css'
import { ParserStatus } from './parser_status'
import parserModule from '../../../share/parsers'
import { ParsedInfo } from '../../../share/parsers/parser'

function StatusPanel({ status, optionsInfo, handleInfoPanelChange, errorMessage, downloadUrl }: { status: ParserStatus, 
    optionsInfo: ParsedInfo, handleInfoPanelChange: React.ChangeEventHandler, errorMessage: string, 
        downloadUrl: React.MouseEventHandler<HTMLButtonElement>}): React.ReactElement {
    if (status === ParserStatus.failed) {
        return (
            <div className="feedback">
                {errorMessage}
            </div>
        )
    } else if (status === ParserStatus.succeed && optionsInfo) {
        return (
            <div className="info-panel">
                {parserModule.getDownloadOptions(optionsInfo, handleInfoPanelChange)}
                <div className="feedback">
                    {errorMessage}
                </div>
                <div className='download-button-row'>
                    <button className="download-button" onClick={downloadUrl}>Download</button>
                </div>
            </div>
        )
    } else if (status === ParserStatus.parsing) {
        return (
            <div className="parsing">
                parsing
            </div>
        )
    }
    return <div></div>
}

export default StatusPanel
export { ParserStatus }