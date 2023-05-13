import * as http from 'node:http'
import { handlePromise, convertDateTimeToUnixTime } from '../utils'
import { DownloadType } from '../models'
import { handleRedirectRequest } from '../http/request'
import { ResponseStatusCode, Header, DIRECTIVE_SPLITER, MEDIA_TYPE_SPLITER, 
    URL_ROUTER_SPLITER, URL_PROTOCOL_SPLITER, URL_PARAMETER_SPLITER, FILE_EXTENSION_DOT, 
    ASSIGNMENT_SPLITER} from '../http/constants'

class PreflightInfo {
    name: string
    size: number | undefined
    type: string
    url: string
    publishedTimestamp: string
    downloadUrl: string
    subType: string
    charset: string | undefined
    downloadType: DownloadType
}

const preflight = async (url: string, additionHeaders?: http.OutgoingHttpHeaders): Promise<PreflightInfo> => {
    const [err, [res, redirectUrl]]: [Error | undefined, [http.IncomingMessage, string]] = 
        await handlePromise<[http.IncomingMessage, string]>(handleRedirectRequest(url, additionHeaders))
    if (err) {
        throw err
    }
    const reponseHeaders: http.IncomingHttpHeaders = res.headers
    const responseStatusCode: number = res.statusCode as number

    if (responseStatusCode !== ResponseStatusCode.OK && responseStatusCode !== ResponseStatusCode.PartialContent) {
        throw new Error(`Response status code ${responseStatusCode}`)
    }

    const preflightInfo = new PreflightInfo()
    preflightInfo.url = url
    preflightInfo.downloadUrl = redirectUrl
    // file's type, subtype and maybe charset
    const headerContentType: string = reponseHeaders[Header.ContentType] as string
    if (headerContentType) {
        let contentType: string, charset: string | undefined = undefined
        if (headerContentType.includes(DIRECTIVE_SPLITER)) {
            const parts: Array<string> = headerContentType.split(DIRECTIVE_SPLITER)
            contentType = parts[0]
            parts[1] = parts[1].trim()
            if (parts[1].startsWith('charset')) {
                charset = parts[1].split(ASSIGNMENT_SPLITER)[1]
            }
        } else {
            contentType = headerContentType
        }
        const parts: Array<string> = contentType.split(MEDIA_TYPE_SPLITER)
        preflightInfo.type = parts[0]
        preflightInfo.subType = parts[1]
        if (charset && preflightInfo.type === 'text')
            preflightInfo.charset = charset
    }
    // file's name
    const headerContentDisposition: string = reponseHeaders[Header.ContentDisposition] as string
    if (headerContentDisposition) {
        const fileNameRe: RegExp = new RegExp('filename=\"(.+)\"')
        const fileNameReResult: RegExpExecArray | null = fileNameRe.exec(headerContentDisposition)
        if (fileNameReResult) 
            preflightInfo.name = fileNameReResult[1] // could be undefined
    } 
    if (!preflightInfo.name) {
        if (url.includes(URL_PROTOCOL_SPLITER)) {
            const parts: Array<string> = url.split(URL_PROTOCOL_SPLITER)
            url = parts[parts.length - 1]
        }
        if (url.includes(URL_ROUTER_SPLITER) && !url.endsWith(URL_ROUTER_SPLITER)) {
            const routes: Array<string> = url.split(URL_ROUTER_SPLITER)
            const routeWithParameter: string = routes[routes.length - 1]
            let route: string
            if (routeWithParameter.includes(URL_PARAMETER_SPLITER)) {
                const routeParts: Array<string> = routeWithParameter.split(URL_PARAMETER_SPLITER)
                route = routeParts[0]
            } else {
                route = routeWithParameter
            }
            if (route.includes(FILE_EXTENSION_DOT)) {
                preflightInfo.name = route
            } else {
                preflightInfo.name = route + FILE_EXTENSION_DOT + preflightInfo.subType
            }
        } else {
            preflightInfo.name = preflightInfo.type + FILE_EXTENSION_DOT + preflightInfo.subType
        }
    }
    // file's size
    if (responseStatusCode === ResponseStatusCode.OK) {
        const headerContentLength: string = reponseHeaders[Header.ContentLength] as string
        if (headerContentLength) {
            preflightInfo.size = parseInt(headerContentLength)
        } else { // chunk
            preflightInfo.size = undefined
        } 
    } else { // statusCode === ResponseStatusCode.PartialContent
        const headerContentRange: string = reponseHeaders[Header.ContentRange] as string
        if (headerContentRange) {
            const parts: Array<string> = headerContentRange.split(MEDIA_TYPE_SPLITER)
            try {
                preflightInfo.size = parseInt(parts[1])
            } catch (error: any) {  
                // Stop the parsing procedure if server returns a * or any other non-number characters as the size of the file server serves.
                // It usually means the file is not ready, as in sometimes YouTube returns Content-Range headers like 'left-right/*', 
                // especially from urls which indicate to low resolution and advanced codecs videos, these urls can be parsed out, but the resource is not there yet, 
                // YouTube sometimes also returns 503 response code alternatively.
                throw new Error(`Can't parse the url to a range download task: ${error}.`)
                // preflightInfo.size = undefined
            }
        } else {
            throw new Error(`Can't parse the url to a range download task: Content-Range header doesn't exist.`)
            // preflightInfo.size = undefined
        }
    }
    // file's published date
    const headerLastModified: string = reponseHeaders[Header.LastModified] as string
    if (headerLastModified) {
        preflightInfo.publishedTimestamp = convertDateTimeToUnixTime(headerLastModified)
    } else {
        preflightInfo.publishedTimestamp = new Date().getTime().toString()
    }
    // downloadType
    if (responseStatusCode === ResponseStatusCode.PartialContent && preflightInfo.size) {
        preflightInfo.downloadType = DownloadType.Range
    } else {
        if (preflightInfo.type === 'application' && 
            (preflightInfo.subType === 'x-mpegURL' || preflightInfo.subType === 'vnd.apple.mpegURL')) {
            preflightInfo.downloadType = DownloadType.Blob
        } else {
            preflightInfo.downloadType = DownloadType.Direct
        }
    }
    return preflightInfo
}

export { PreflightInfo, preflight }