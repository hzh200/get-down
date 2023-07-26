import * as http from 'node:http';
import * as React from 'react';
import InfoRow from '../InfoRow';
import ExtractorInfo from './extractorInfo';

interface Parser extends ExtractorInfo {
    parse(url: string, additionHeaders?: http.OutgoingHttpHeaders): Promise<ParsedInfo>;
    DownloadOptions({ parsedInfo, handleInfoChange }:
        { parsedInfo: ParsedInfo, handleInfoChange: React.ChangeEventHandler<HTMLElement> }): React.ReactElement;
    addTask(parsedInfo: ParsedInfo, additionalInfo?: string): void;
}

// common parsed info.
class ParsedInfo {
    name: string;
    location: string;
}

// for combination of advanced components.
const DownloadOptionsBase = ({ parsedInfo, handleInfoChange }:
    { parsedInfo: ParsedInfo, handleInfoChange: React.ChangeEventHandler<HTMLElement> }): React.ReactElement => {
    return (
        <React.Fragment>
            <InfoRow>
                <label>File name:</label>
                <input className="resource-name" type="text" value={parsedInfo.name} name='name' onChange={handleInfoChange} />
            </InfoRow>
            <InfoRow>
                <label>Location:</label>
                <input className="download-location" type="text" value={parsedInfo.location} name='location' onChange={handleInfoChange} />
            </InfoRow>
            {/* <InfoRow>
                <label>Use proxy? </label>
                <input className="use-proxy" type="checkbox" checked={parsedInfo.useProxy} name='useProxy' onChange={handleInfoChange} />
            </InfoRow> */}
        </React.Fragment>
    );
};

export { Parser, ParsedInfo, DownloadOptionsBase };