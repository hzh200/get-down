import * as http from 'node:http'
import * as https from 'node:https'
import * as zlib from 'node:zlib'
import * as stream from 'node:stream'
import { Protocol } from './option'

enum StreamEvent {
    Data = 'data',
    Error = 'error',
    End = 'end',
    Close = 'close'
}

const httpRequest = (options: http.RequestOptions): Promise<[http.ClientRequest, http.IncomingMessage]> => {
    // if (options.protocol === Protocol.HTTPSProtocol) {
    //     return new Promise((resolve, reject) => {
    //         https.get(options, (res: http.IncomingMessage) => {
    //             resolve(res)
    //         }).on('error', (err: Error) => {
    //             reject(err)
    //         })
    //     })
    // } else { // http://
    //     return new Promise((resolve, reject) => {
    //         http.get(options, (res: http.IncomingMessage) => {
    //             resolve(res)
    //         }).on('error', (err: Error) => {
    //             reject(err)
    //         })
    //     })
    // }
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

const getHttpRequestTextContent = (res: http.IncomingMessage): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        try {
            let resData: string = ''
            for await (const chunk of res) {
                resData += chunk
            }
            resolve(resData)
        } catch (error: any) {
            reject(error)
        }
    })
}

enum Decoding {
    Gzip = 'gzip',
    Br = 'br',
    Deflate = 'deflate'
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

export { httpRequest, getHttpRequestTextContent, getDecodingStream, StreamEvent }