import * as http from 'node:http'
import * as https from 'node:https'
import * as zlib from 'node:zlib'
import * as stream from 'node:stream'
import { handlePromise } from '../utils'
import { generateRequestOption, getHeaders, getPreflightHeaders } from './options'
import { combineRelativePath } from './util'
import { Protocol, StreamEvent, Decoding, ResponseStatusCode, Header, URL_REGEX} from './constants'

const httpRequest = (options: http.RequestOptions): Promise<[http.ClientRequest, http.IncomingMessage]> => {
    return new Promise((resolve, reject) => {
        let requestModule: any = http
        if (options.protocol === Protocol.HTTPSProtocol) {
            requestModule = https
        }
        const request: http.ClientRequest = requestModule.get(options, (response: http.IncomingMessage) => {
            request.removeAllListeners(StreamEvent.Error)
            resolve([request, response])
        })
        request.once(StreamEvent.Error, (error: Error) => {
            reject(error)
        })
    })
}

const getHttpRequestTextContent = (request: http.ClientRequest, response: http.IncomingMessage): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        request.on('error', (error: Error) => {
            reject(error)
        })
        response.setTimeout(15000, () => {
            reject(new Error('parse timeout'))
        })
        response.setEncoding('utf-8')
        try {
            let resData: string = ''
            for await (const chunk of response) {
                resData += chunk
            }
            resolve(resData)
        } catch (error: any) {
            reject(error)
        }
    })
}

const getDecodingStream = (encoding: string): stream.Transform => {
    let unzip: zlib.Unzip | zlib.Gunzip | zlib.BrotliDecompress | zlib.Inflate = zlib.createUnzip()
    if (encoding === Decoding.Gzip) {
        unzip = zlib.createGunzip()
    } else if (encoding === Decoding.Br) {
        unzip = zlib.createBrotliDecompress()
    } else if (encoding === Decoding.Deflate) {
        unzip = zlib.createInflate()
    } else {
        throw new Error('Unsupported Compress Algorithm')
    }
    return unzip
}

const REDIRECT_LIMIT = 3

const handleRedirectRequest = async (url: string, additionHeaders?: http.OutgoingHttpHeaders): Promise<[http.IncomingMessage, string]> => {
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

export { httpRequest, getHttpRequestTextContent, getDecodingStream, handleRedirectRequest }