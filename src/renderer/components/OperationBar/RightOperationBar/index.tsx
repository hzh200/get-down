import * as React from 'react';
import OperationBarItem from '../OperationButton';
import cogSvg from './cog.svg';

function RightOperationBar({ openSetting }: { openSetting: React.MouseEventHandler<HTMLDivElement> }) {
    return (
        <div className='right-Operation-bar'>
            <OperationBarItem imgSrc={cogSvg} size={22} handleClick={openSetting} />
        </div>
    );
}

export default RightOperationBar;