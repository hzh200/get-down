import * as http from 'node:http';

interface ExtractorInfo {
    extractorNo: number;
    extractTarget: string;
    host: string;
    requestHeaders?: http.OutgoingHttpHeaders;
    // downloadHeaders: http.OutgoingHttpHeaders
}

export default ExtractorInfo;