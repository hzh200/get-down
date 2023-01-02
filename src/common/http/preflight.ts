import * as http from 'node:http'
import { handlePromise } from '../utils'
import { httpRequest, getHttpRequestTextContent } from './request'
import { ResponseStatusCode } from './response'
import { urlRe } from './validation'
import { getHeaders, getPreflightHeaders, Header } from './header'
import { generateRequestOption } from './option'

const parameterSpliter: string = ';'
const contentSpliter: string = '/'
const urlSpliter: string = '/'
const urlDoubleSpliter: string = '//'
const fileExtensionDot: string = '.'
const equationSpliter: string = '='

const redirectLimit = 3

class ParsedInfo {
    name: string
    size: number | undefined
    type: string
    url: string
    createAt: string
    downloadUrl: string
    subType: string
    charset: string | undefined
    isRange: boolean
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
        } else if (urlRe.exec(data)) {
            redirect = (urlRe.exec(data) as RegExpExecArray)[1]
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
    while (checkRedirectStatus(response.statusCode) && retryCount++ < redirectLimit) {
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

    const parsedInfo = new ParsedInfo()
    parsedInfo.url = url
    parsedInfo.downloadUrl = redirectUrl
    // file's type, subtype and maybe charset
    const headerContentType: string = reponseHeaders[Header.ContentType] as string
    if (headerContentType) {
        let contentType: string, charset: string | undefined = undefined
        if (headerContentType.includes(parameterSpliter)) {
            const parts: Array<string> = headerContentType.split(parameterSpliter)
            contentType = parts[0]
            parts[1] = parts[1].trim()
            if (parts[1].startsWith('charset')) {
                charset = parts[1].split(equationSpliter)[1]
            }
        } else {
            contentType = headerContentType
        }
        const parts: Array<string> = contentType.split(contentSpliter)
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
        if (url.indexOf(urlDoubleSpliter) !== -1) {
            const parts: Array<string> = url.split(urlDoubleSpliter)
            url = parts[parts.length - 1]
        }
        if (url.indexOf(urlSpliter) !== -1 && !url.endsWith(urlSpliter)) {
            const parts: Array<string> = url.split(urlSpliter)
            const part: string = parts[parts.length - 1]
            if (part.indexOf(fileExtensionDot) !== -1) {
                parsedInfo.name = part
            } else {
                parsedInfo.name = part + fileExtensionDot + parsedInfo.subType
            }
        } else {
            parsedInfo.name = parsedInfo.type + fileExtensionDot + parsedInfo.subType
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
            const parts: Array<string> = headerContentRange.split(contentSpliter)
            try {
                parsedInfo.size = parseInt(parts[1])
            } catch (error: any) {
                parsedInfo.size = undefined
            }
        } else {
            parsedInfo.size = undefined
        }
    }
    // file's createAt time
    const headerLastModified: string = reponseHeaders[Header.LastModified] as string
    if (headerLastModified) {
        parsedInfo.createAt = new Date(headerLastModified).toISOString()
    }
    // isRange
    if (responseStatusCode === ResponseStatusCode.PartialContent) {
        parsedInfo.isRange = true
    } else {
        parsedInfo.isRange = false
    }
    return parsedInfo
}

export { ParsedInfo, preflight }