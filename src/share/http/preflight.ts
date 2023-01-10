import * as http from 'node:http'
import { handlePromise } from '../utils'
import { DownloadType } from '../models'
import { httpRequest, getHttpRequestTextContent } from './request'
import { ResponseStatusCode, Header } from './constants'
import { URL_REGEX } from './validation'
import { getHeaders, getPreflightHeaders } from './header'
import { generateRequestOption } from './option'

const DIRECTIVE_SPLITER: string = ';'
const MEDIA_TYPE_SPLITER: string = '/'
const URL_ROUTER_SPLITER: string = '/'
const URL_PROTOCOL_SPLITER: string = '//'
const URL_PARAMETER_SPLITER: string = '?'
const FILE_EXTENSION_DOT: string = '.'
const ASSIGNMENT_SPLITER: string = '='

const REDIRECT_LIMIT = 3

class ParsedInfo {
    name: string
    size: number | undefined
    type: string
    url: string
    createdAt: string
    downloadUrl: string
    subType: string
    charset: string | undefined
    downloadType: DownloadType
}

const checkRedirectStatus = (statusCode: number | undefined): boolean => {
    if (!statusCode) {
        return false
    }
    if (statusCode === ResponseStatusCode.MovedPermanently || statusCode === ResponseStatusCode.Found || statusCode === ResponseStatusCode.TemporaryRedirect || statusCode === ResponseStatusCode.PermanentRedirect) {
        return true
    }
    return false
}

const handleRedirectRequest = async (url: string, getHeaders: getHeaders): Promise<[http.IncomingMessage, string]> => {
    const fetchRedirect = async (response: http.IncomingMessage): Promise<string> => {
        let redirect: string
        const data = await getHttpRequestTextContent(response)
        if (response.headers[Header.Location]) {
            redirect = response.headers[Header.Location] as string
        } else if (URL_REGEX.exec(data)) {
            redirect = (URL_REGEX.exec(data) as RegExpExecArray)[1]
        } else {
            throw new Error('no redirect url parsed out')
        }
        return redirect
    }

    let requestOptions: http.RequestOptions = await generateRequestOption(url, getHeaders)
    let [err, [request, response]]: [Error | undefined, [http.ClientRequest, http.IncomingMessage]] = await handlePromise<[http.ClientRequest, http.IncomingMessage]>(httpRequest(requestOptions))
    if (err) {
        throw err
    }
    let retryCount = 0
    while (checkRedirectStatus(response.statusCode) && retryCount++ < REDIRECT_LIMIT) {
        let [err, url] = await handlePromise<string>(fetchRedirect(response))
        if (err) {
            throw err
        }
        requestOptions = await generateRequestOption(url, getHeaders)
        ;[err, [request, response]] = await handlePromise<[http.ClientRequest, http.IncomingMessage]>(httpRequest(requestOptions))
        if (err) {
            throw err
        }
    }
    if (checkRedirectStatus(response.statusCode)) {
        throw new Error('too much redirections')
    }
    return [response, url]
}

const preflight = async (url: string): Promise<ParsedInfo> => {
    const [err, [res, redirectUrl]]: [Error | undefined, [http.IncomingMessage, string]] = await handlePromise<[http.IncomingMessage, string]>(handleRedirectRequest(url, getPreflightHeaders))
    if (err) {
        throw err
    }
    const reponseHeaders: http.IncomingHttpHeaders = res.headers
    const responseStatusCode: number = res.statusCode as number

    if (responseStatusCode !== ResponseStatusCode.OK && responseStatusCode !== ResponseStatusCode.PartialContent) {
        throw new Error(`Response status code ${responseStatusCode}`)
    }

    const parsedInfo = new ParsedInfo()
    parsedInfo.url = url
    parsedInfo.downloadUrl = redirectUrl
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
        parsedInfo.type = parts[0]
        parsedInfo.subType = parts[1]
        if (charset && parsedInfo.type === 'text')
            parsedInfo.charset = charset
    }
    // file's name
    const headerContentDisposition: string = reponseHeaders[Header.ContentDisposition] as string
    if (headerContentDisposition) {
        const fileNameRe: RegExp = new RegExp('filename=\"(.+)\"')
        const fileNameReResult: RegExpExecArray | null = fileNameRe.exec(headerContentDisposition)
        if (fileNameReResult) 
            parsedInfo.name = fileNameReResult[1] // could be undefined
    } 
    if (!parsedInfo.name) {
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
                parsedInfo.name = route
            } else {
                parsedInfo.name = route + FILE_EXTENSION_DOT + parsedInfo.subType
            }
        } else {
            parsedInfo.name = parsedInfo.type + FILE_EXTENSION_DOT + parsedInfo.subType
        }
    }
    // file's size
    if (responseStatusCode === ResponseStatusCode.OK) {
        const headerContentLength: string = reponseHeaders[Header.ContentLength] as string
        if (headerContentLength) {
            parsedInfo.size = parseInt(headerContentLength)
        } else { // chunk
            parsedInfo.size = undefined
        } 
    } else { // statusCode === ResponseStatusCode.PartialContent
        const headerContentRange: string = reponseHeaders[Header.ContentRange] as string
        if (headerContentRange) {
            const parts: Array<string> = headerContentRange.split(MEDIA_TYPE_SPLITER)
            try {
                parsedInfo.size = parseInt(parts[1])
            } catch (error: any) {
                parsedInfo.size = undefined
            }
        } else {
            parsedInfo.size = undefined
        }
    }
    // file's createdAt time
    const headerLastModified: string = reponseHeaders[Header.LastModified] as string
    if (headerLastModified) {
        parsedInfo.createdAt = new Date(headerLastModified).toISOString()
    }
    // downloadType
    if (responseStatusCode === ResponseStatusCode.PartialContent) {
        parsedInfo.downloadType = DownloadType.Range
    } else {
        if (parsedInfo.type === 'application' && 
            (parsedInfo.subType === 'x-mpegURL' || parsedInfo.subType === 'vnd.apple.mpegURL')) {
            parsedInfo.downloadType = DownloadType.Blob
        } else {
            parsedInfo.downloadType = DownloadType.Direct
        }
    }
    return parsedInfo
}

export { ParsedInfo, preflight }