import * as http from 'node:http'
import * as https from 'node:https'
import * as zlib from 'node:zlib'
import * as stream from 'node:stream'
import { Protocol, StreamEvent, Decoding } from './constants'

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

export { httpRequest, getHttpRequestTextContent, getDecodingStream }