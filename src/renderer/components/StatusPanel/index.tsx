import * as React from 'react'
import './status_panel.css'
import InfoRow from './InfoRow'
import { ParserStatus } from './parser_status'
import { parserModule } from '../../../share/parsers'
import { DefaultParsedInfo } from '../../../share/parsers/default_parser'

function StatusPanel({ status, parsedInfo, handleInfoPanelChange, errorMessage, downloadUrl }: { status: ParserStatus, 
        parsedInfo: DefaultParsedInfo, handleInfoPanelChange: React.ChangeEventHandler, errorMessage: string, 
        downloadUrl: React.MouseEventHandler<HTMLButtonElement>}): React.ReactElement {
    if (status === ParserStatus.failed) {
        return (
            <div className="feedback">
                {errorMessage}
            </div>
        )
    } else if (status === ParserStatus.succeed && parsedInfo) {
        return (
            <div className="info-panel">
                {parserModule.getDownloadOptions(parsedInfo, handleInfoPanelChange)}
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
export { InfoRow, ParserStatus }