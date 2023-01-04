import * as http from 'node:http'
import { Header } from './constants'

const parseHost = (url: string): string => {
    let temp: string = url.split('//')[1]
    if (temp.includes('/')) {
        return temp.split('/')[0]
    } else if (temp.includes('?')) {
        return temp.split('?')[0]
    } else {
        return temp
    }
}

const preflightHeaders: http.OutgoingHttpHeaders = {
    [Header.UserAgent]: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.148 Safari/537.36 http-downloader/1.0.0 Electron/19.0.8',
    // [Header.Accept]: '*/*',
    // [Header.AcceptEncoding]: "gzip, deflate, br, compress, identity",
    // [Header.AcceptLanguage]: 'zh-CN,zh;q=0.9,en;q=0.8',
    [Header.Connection]: 'keep-alive', // useless
    // check if server supports range download
    [Header.Range]: 'bytes=0-0',
    [Header.Host]: '',
    [Header.Referer]: '' // it's added when requesting a redirect href
}

const downloadHeaders: http.OutgoingHttpHeaders = {
    [Header.UserAgent]: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) http-downloader/1.0.0 Chrome/102.0.5005.148 Electron/19.0.8 Safari/537.36',
    [Header.Accept]: '*/*',
    [Header.AcceptEncoding]: 'gzip, identity, *',
    [Header.AcceptLanguage]: 'zh-CN,zh;q=0.9,en;q=0.8',
    [Header.Connection]: 'keep-alive',
    // 'Sec-Fetch-Dest': 'empty',
    // 'Sec-Fetch-Mode': 'cors',
    // 'Sec-Fetch-Site': 'cross-site',
    [Header.Host]: '',
    [Header.Referer]: ''
}

type getHeaders = (url: string) => http.OutgoingHttpHeaders

const getPreflightHeaders: getHeaders = (url) => {
    const host: string = parseHost(url)
    preflightHeaders[Header.Host] = host
    return preflightHeaders
}

const getDownloadHeaders: getHeaders = (url) => {
    const host: string = parseHost(url)
    downloadHeaders[Header.Host] = host
    return downloadHeaders
}

export { getHeaders, getPreflightHeaders, getDownloadHeaders }