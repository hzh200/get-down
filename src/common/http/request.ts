import * as http from 'node:http'
import * as https from 'node:https'
import { Protocol } from './option'

const httpRequest = (options: http.RequestOptions): Promise<http.IncomingMessage> => {
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
        const request: http.ClientRequest  = requestModule.get(options, (res: http.IncomingMessage) => {
            resolve(res)
        }).on('error', (err: Error) => {
            reject(err)
        })
        request.on('error', (err: Error) => {
            reject(err)
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

export { httpRequest, getHttpRequestTextContent }