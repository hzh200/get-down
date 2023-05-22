import * as http from 'node:http'
import ExtractorInfo from '../interfaces/extractorInfo'
import { Header, FILE_EXTENSION_DOT } from '../../http/constants'

class YouTube implements ExtractorInfo {
    extractorNo: number = 2
    extractTarget: string = 'YouTube'
    host: string = 'https://www.youtube.com'

    requestHeaders: http.OutgoingHttpHeaders = {
        [Header.Referer]: this.host
    }
}

export default YouTube