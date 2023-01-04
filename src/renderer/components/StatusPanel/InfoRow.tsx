import * as React from 'react'

function InfoRow({ children }: { children: React.ReactElement | Array<React.ReactElement> }): React.ReactElement {
    return (
        <div className="info-panel-row">
            {children}
        </div>
    )
}

export default InfoRow