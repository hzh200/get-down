import * as React from 'react';
import './popup.css';

function Popup({ showPopup, setShowPopup, children }:
    { showPopup: boolean, setShowPopup: React.Dispatch<React.SetStateAction<boolean>>, children: Array<React.ReactElement<any>> | JSX.Element }): JSX.Element {
    const popup = <div className='popup'>
        <div className='popup-inner'>
            <button className='popup-close-button' onClick={() => setShowPopup(false)}>x</button>
            {children}
            {/* <div className='popup-button-row'>
                <button className='popup-confirm-button' onClick={confirm}>Confirm</button>
                <button className='popup-cancel-button' onClick={cancel}>Cancel</button>
            </div> */}
        </div>
    </div>;
    return (showPopup ? popup : <div />);
}

export default Popup;