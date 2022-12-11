import * as React from 'react'
import OperationBarItem from '../operationButton'

import plusSvg from './plus.svg'
import playSvg from './play.svg'
import pauseSvg from './pause.svg'
import trashSvg from './trash.svg'

function LeftOperationBar({play, pause, trash, openParser}: { play: React.MouseEventHandler<HTMLDivElement>, 
    pause: React.MouseEventHandler<HTMLDivElement>, trash: React.MouseEventHandler<HTMLDivElement>, 
    openParser: React.MouseEventHandler<HTMLDivElement> }) {
    return (
        <div className='left-operation-bar'>
            <OperationBarItem imgSrc={plusSvg} size={24} handleClick={openParser} />
            <OperationBarItem imgSrc={playSvg} size={16} handleClick={play} />
            <OperationBarItem imgSrc={pauseSvg} size={16} handleClick={pause} />
            <OperationBarItem imgSrc={trashSvg} size={16} handleClick={trash} />
        </div>
    )
}

export default LeftOperationBar