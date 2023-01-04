import * as React from 'react'
import LeftOperationBar from './LeftOperationBar'
import RightOperationBar from './RightOperationBar'
import './operation_bar.css'

function OperationBar({play, pause, trash, openParser, openSetting}: { play: React.MouseEventHandler<HTMLDivElement>, 
    pause: React.MouseEventHandler<HTMLDivElement>, trash: React.MouseEventHandler<HTMLDivElement>, 
    openParser: React.MouseEventHandler<HTMLDivElement>, openSetting: React.MouseEventHandler<HTMLDivElement> }) {
    return (
        <div className='operation-bar'>
            <LeftOperationBar play={play} pause={pause} trash={trash} openParser={openParser} />
            <RightOperationBar openSetting={openSetting} />
        </div>
    )
}

export default OperationBar