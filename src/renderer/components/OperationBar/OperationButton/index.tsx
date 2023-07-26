import * as React from 'react';

function OperationBarItem({ imgSrc, size, handleClick }: { imgSrc: string, size: number, handleClick: React.MouseEventHandler<HTMLDivElement> }) {
    return (
        <div className="operation-bar-item" onClick={handleClick}>
            <OperationBarButton imgSrc={imgSrc} size={size} />
        </div>
    );
}

function OperationBarButton({ imgSrc, size }: { imgSrc: string, size: number }) {
    return (
        <div className="operation-bar-button">
            <img src={imgSrc} height={size} width={size} />
        </div>
    );
}

export default OperationBarItem;