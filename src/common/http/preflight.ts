import * as http from 'node:http'
import { handlePromise } from '../utils'
import { httpRequest, getHttpRequestTextContent } from './request'
import { urlRe } from './validation'
import { getHeaders, getPreflightHeaders } from './header'
import { generateRequestOption } from './option'

const parameterSpliter: string = ';'
const contentSpliter: string = '/'
const urlSpliter: string = '/'
const urlDoubleSpliter: string = '//'
const fileExtensionDot: string = '.'

const redirectLimit = 3

class ParsedInfo {
    name: string
    size: number | null
    type: string
    url: string
    createAt: string
    downloadUrl: string
    subType: string
    charset: string | null
    isRange: boolean
}

const checkRedirectStatus = (statusCode: number | undefined): boolean => {
    if (!statusCode) {
        return false
    }
    if (statusCode === 301 || statusCode === 302 || statusCode === 307 || statusCode === 308) {
        return true
    }
    return false
}

const handleRedirectRequest = async (url: string, getHeaders: getHeaders): Promise<[http.IncomingMessage, string]> => {
    const fetchRedirect = async (response: http.IncomingMessage): Promise<string> => {
        let redirect: string
        const data = await getHttpRequestTextContent(response)
        if (response.headers['location']) {
            redirect = response.headers['location']
        } else if (urlRe.exec(data)) {
            redirect = (urlRe.exec(data) as RegExpExecArray)[1]
        } else {
            throw new Error('no redirect url parsed out')
        }
        return redirect
    }

    let requestOptions: http.RequestOptions = await generateRequestOption(url, getHeaders)
    let [request, response]: [http.ClientRequest, http.IncomingMessage] = await httpRequest(requestOptions)
    request.on('error', (err: Error) => {
        throw err
    })
    let retryCount = 0
    while (checkRedirectStatus(response.statusCode)
                && retryCount++ < redirectLimit) {
        let [err, url] = await handlePromise<string>(fetchRedirect(response))
        if (err) {
            throw err
        }
        requestOptions = await generateRequestOption(url, getHeaders)
        ;[request, response] = await httpRequest(requestOptions)
        request.on('error', (err: Error) => {
            throw err
        })
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
    if (reponseHeaders['content-type']) {
        let contentType, charset = null
        if (reponseHeaders['content-type'].includes(parameterSpliter)) {
            const parts = reponseHeaders['content-type'].split(parameterSpliter)
            contentType = parts[0]
            parts[1] = parts[1].trim()
            if (parts[1].startsWith('charset')) {
                charset = parts[1].split('=')[1]
            }
        } else {
            contentType = reponseHeaders['content-type']
        }
        const parts = contentType.split(contentSpliter)
        parsedInfo.type = parts[0]
        parsedInfo.subType = parts[1]
        // if (parsedInfo.type === 'text' && charset)
        parsedInfo.charset = charset
        
    }
    // file's name
    if (reponseHeaders['content-disposition']) {
        const fileNameRe = new RegExp('filename=\"(.+)\"')
        const fileNameReResult = fileNameRe.exec(reponseHeaders['content-disposition'])
        if (fileNameReResult) 
            parsedInfo.name = fileNameReResult[1] // could be undefined
    } 
    if (!parsedInfo.name) {
        if (url.indexOf(urlDoubleSpliter) !== -1) {
            const parts = url.split(urlDoubleSpliter)
            url = parts[parts.length - 1]
        }
        if (url.indexOf(urlSpliter) !== -1 && !url.endsWith(urlSpliter)) {
            const parts = url.split(urlSpliter)
            const part = parts[parts.length - 1]
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
    if (responseStatusCode === 200) {
        if (reponseHeaders['content-length']) {
            parsedInfo.size = parseInt(reponseHeaders['content-length'])
        } else { // chunk
            parsedInfo.size = null
        } 
    } else { // statusCode === 206
        if (reponseHeaders['content-range']) {
            const parts = reponseHeaders['content-range'].split(contentSpliter)
            try {
                parsedInfo.size = parseInt(parts[1])
            } catch (error: any) {
                parsedInfo.size = null
            }
        } else {
            parsedInfo.size = null
        }
    }
    // file's createAt time
    if (reponseHeaders['last-modified']) {
        parsedInfo.createAt = new Date(reponseHeaders['last-modified']).toISOString()
    }
    // isRange
    if (responseStatusCode === 206) {
        parsedInfo.isRange = true
    } else {
        parsedInfo.isRange = false
    }
    return parsedInfo
}

export { ParsedInfo, preflight }