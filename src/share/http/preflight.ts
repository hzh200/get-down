import * as http from 'node:http'
import { handlePromise } from '../utils'
import { DownloadType } from '../models'
import { httpRequest, getHttpRequestTextContent } from './request'
import { ResponseStatusCode, Header, URL_REGEX, DIRECTIVE_SPLITER, MEDIA_TYPE_SPLITER, 
    URL_ROUTER_SPLITER, URL_PROTOCOL_SPLITER, URL_PARAMETER_SPLITER, FILE_EXTENSION_DOT, 
    ASSIGNMENT_SPLITER, Protocol} from './constants'
import { generateRequestOption, getHeaders, getPreflightHeaders } from './options'
import { combineRelativePath } from './util'

const REDIRECT_LIMIT = 3

class PreflightInfo {
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
    if (statusCode === ResponseStatusCode.MovedPermanently || statusCode === ResponseStatusCode.Found 
        || statusCode === ResponseStatusCode.TemporaryRedirect || statusCode === ResponseStatusCode.PermanentRedirect) {
        return true
    }
    return false
}

const preflight = async (url: string, additionHeaders?: http.OutgoingHttpHeaders): Promise<PreflightInfo> => {
    const handleRedirectRequest = async (): Promise<[http.IncomingMessage, string]> => {
        const fetchRedirect = async (request: http.ClientRequest, response: http.IncomingMessage): Promise<string> => {
            let redirect: string
            const data = await getHttpRequestTextContent(request, response)
            if (response.headers[Header.Location]) {
                redirect = response.headers[Header.Location] as string
            } else if (URL_REGEX.exec(data)) {
                redirect = (URL_REGEX.exec(data) as RegExpExecArray)[1]
            } else {
                throw new Error('no redirect url parsed out')
            }
            if (!redirect.startsWith(Protocol.HTTPProtocol) && !redirect.startsWith(Protocol.HTTPSProtocol)) {
                redirect = combineRelativePath(url, redirect)
            }
            return redirect
        }
    
        let requestOptions: http.RequestOptions = await generateRequestOption(url, getPreflightHeaders, additionHeaders)
        let [err, [request, response]]: [Error | undefined, [http.ClientRequest, http.IncomingMessage]] = 
            await handlePromise<[http.ClientRequest, http.IncomingMessage]>(httpRequest(requestOptions))
        if (err) {
            throw err
        }
        let retryCount = 0
        while (checkRedirectStatus(response.statusCode) && retryCount++ < REDIRECT_LIMIT) {
            ;[err, url] = await handlePromise<string>(fetchRedirect(request, response))
            if (err) {
                throw err
            }
            requestOptions = await generateRequestOption(url, getPreflightHeaders, additionHeaders)
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

    const [err, [res, redirectUrl]]: [Error | undefined, [http.IncomingMessage, string]] = 
        await handlePromise<[http.IncomingMessage, string]>(handleRedirectRequest())
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
                preflightInfo.size = undefined
            }
        } else {
            preflightInfo.size = undefined
        }
    }
    // file's createdAt time
    const headerLastModified: string = reponseHeaders[Header.LastModified] as string
    if (headerLastModified) {
        preflightInfo.createdAt = new Date(headerLastModified).toISOString()
    }
    // downloadType
    if (responseStatusCode === ResponseStatusCode.PartialContent) {
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