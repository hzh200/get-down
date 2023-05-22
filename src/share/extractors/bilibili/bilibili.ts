import * as http from 'node:http'
import ExtractorInfo from '../interfaces/extractorInfo'
import { Header, FILE_EXTENSION_DOT } from '../../http/constants'

class Bilibili implements ExtractorInfo {
    extractorNo: number = 1
    extractTarget: string = 'bilibili'
    host: string = 'https://www.bilibili.com'

    requestHeaders: http.OutgoingHttpHeaders = {
        [Header.Referer]: this.host
    }
}

export default Bilibili