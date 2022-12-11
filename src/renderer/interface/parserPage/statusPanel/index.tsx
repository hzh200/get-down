import * as React from 'react'
import './status_panel.css'
import { ParserStatus } from '../parser_page'
import { parserModule } from '../../../../common/parsers'

function InfoRow({ children }: { children: React.ReactElement | Array<React.ReactElement> }): React.ReactElement {
    return (
        <div className="info-panel-row">
            {children}
        </div>
    )
}

function InfoPanel({ children, downloadUrl }: { children: React.ReactElement | Array<React.ReactElement>, downloadUrl: React.MouseEventHandler<HTMLButtonElement> }): React.ReactElement {
    return (
        <div className="info-panel">
            {children}
            <div className='download-button-row'>
                <button className="download-button" onClick={downloadUrl}>Download</button>
            </div>
        </div>
        
    )
}

function StatusPanel({ status, parsedInfo, handleInfoPanelChange, errorMessage, downloadUrl }: { status: ParserStatus, 
        parsedInfo: {[key: string]: any}, handleInfoPanelChange: React.ChangeEventHandler, errorMessage: string, 
        downloadUrl: React.MouseEventHandler<HTMLButtonElement>}): React.ReactElement {
    if (status === ParserStatus.failed) {
        return (
            <div className="feedback">
                {errorMessage}
            </div>
        )
    } else if (status === ParserStatus.succeed && parsedInfo) {
        return (
            <InfoPanel downloadUrl={downloadUrl}>
                {parserModule.getDownloadOptions(parsedInfo, handleInfoPanelChange)}
            </InfoPanel>
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
export { InfoRow }