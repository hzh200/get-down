import * as React from 'react';
import OperationBarItem from '../OperationButton';

import plusSvg from './plus.svg';
import playSvg from './play.svg';
import pauseSvg from './pause.svg';
import trashSvg from './trash.svg';

function LeftOperationBar({ play, pause, trash, openParser }: { play: Function, pause: Function, trash: Function, openParser: React.MouseEventHandler<HTMLDivElement> }) {
    return (
        <div className='left-operation-bar'>
            <OperationBarItem imgSrc={plusSvg} size={24} handleClick={openParser} />
            <OperationBarItem imgSrc={playSvg} size={16} handleClick={(_event: React.MouseEvent<HTMLDivElement>) => play()} />
            <OperationBarItem imgSrc={pauseSvg} size={16} handleClick={(_event: React.MouseEvent<HTMLDivElement>) => pause()} />
            <OperationBarItem imgSrc={trashSvg} size={16} handleClick={(_event: React.MouseEvent<HTMLDivElement>) => trash()} />
        </div>
    );
}

export default LeftOperationBar;