import axios, { AxiosRequestHeaders, AxiosResponse } from 'axios'
import axiosRetry from 'axios-retry'
import * as React from 'react'
import { Parser } from './index'
import { InfoRow } from '../../renderer/interface/parserPage/statusPanel'

import { Task } from '../../common/models'
import { handlePromise } from '../../common/utils'
import { ipcRenderer } from 'electron'

class DefaultParsedInfo {
    name: string
    size: number
    type: string
    declare url: string
    declare status: string
    declare progress: number
    declare createAt: string // timestamp added automatically by Sequelize
    declare updateAt: string // timestamp added automatically by Sequelize

    downloadUrl: string
    subType: string
    charset: string
    location: string
    isRange: boolean
    downloadRanges: Array<Array<number>>
    useProxy: boolean
    parent: number // parent TaskSet
}

class DefaultParser implements Parser {
    parserNo = 0
    parseTarget: string = 'default'

    constructor() {
        axiosRetry(axios, { retries: 3 })
    }

    parameterSpliter: string = ';'
    contentSpliter: string = '/'
    urlSpliter: string = '/'
    urlDoubleSpliter: string = '//'
    fileExtensionDot: string = '.'

    requestHeaders: AxiosRequestHeaders = {
        // "Host": "github.com",
        // "User-Agent": "Chrome/97.0.4692.99",
        // 'Accept': '*/*',
        // it's added when requesting a redirect href
        // "Referer":         "https://github.com",
        "Accept-Encoding": "gzip, deflate, br",
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        // server wouldn't return a Content-Length header when setting Connection to keep-alive
        // "Connection": "keep-alive",
        // check if server supports range download
        'Range': 'bytes=0-0',
    }

    downloadHeaders: AxiosRequestHeaders = {
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36'
    }

    // Fetch redirected response 
    parse = async (url: string): Promise<[AxiosResponse, string]> => {
        let res: AxiosResponse = await this.httpRequest(url)
        const handleRedirect = async (): Promise<string> => {
            let redirectedUrl: string | undefined
            const fetchRedirectUrl = (response: AxiosResponse<string>): string => {
                const urlRe = new RegExp('^(https?):\/\/[-A-Za-z0-9+&@#\/%?=~_|!:,.;]+[-A-Za-z0-9+&@#\/%=~_|]')
                let url
                if (response.headers['location'] !== null) {
                    url = response.headers['location']
                } else if (urlRe.exec(response.data) !== null) {
                    url = (urlRe.exec(response.data) as RegExpExecArray)[1]
                } else {
                    throw new Error('no redirect url parsed out')
                }
                return url
            }

            // Retry up to three times
            try {
                let redirectLimit = 3
                while ((res.status === 301 || res.status === 302) && redirectLimit-- > 0) {
                    redirectedUrl = fetchRedirectUrl(res)
                    res = await this.httpRequest(redirectedUrl)
                }
                if (res.status === 301 || res.status === 302) {
                    throw new Error('too much redirections')
                }
            } catch (error: any) {
                throw error
            }
            return redirectedUrl ? redirectedUrl : url
        }
        const downloadUrl: string = await handleRedirect()
        if (res.status !== 200 && res.status !== 206) {
            throw new Error('request error')
        }
        return [res, downloadUrl]
    }

    httpRequest = (url: string, headers: AxiosRequestHeaders = this.requestHeaders): Promise<AxiosResponse> => {
        return new Promise((resolve, reject) => {
            axios.get(url, {
                headers: headers
            }).then(
                (response) => {
                    resolve(response)
                }
            ).catch(
                (error: Error) => {
                    reject(error)
                }
            )
        })
    }

    parseUrlInfo = (url: string, downloadUrl: string, statusCode: number, headers: {[key: string]: string}, setting: {[key: string]: any}): {[key: string]: any} => {
        const parsedInfo = new DefaultParsedInfo()
        parsedInfo.url = url
        parsedInfo.downloadUrl = downloadUrl
        // file's type, subtype and maybe charset
        if (headers['content-type']) {
            let contentType, charset
            if (headers['content-type'].includes(this.parameterSpliter)) {
                const parts = headers['content-type'].split(this.parameterSpliter)
                contentType = parts[0]
                parts[1] = parts[1].trim()
                if (parts[1].startsWith('charset')) {
                    charset = parts[1].split('=')[1]
                }
            } else {
                contentType = headers['content-type']
            }
            const parts = contentType.split(this.contentSpliter)
            parsedInfo.type = parts[0]
            parsedInfo.subType = parts[1]
            if (parsedInfo.type === 'text' && charset) {
                parsedInfo.charset = charset
            }
        }
        // file's name
        if (headers['content-disposition']) {
            const fileNameRe = new RegExp('filename=\"(.+)\"')
            const fileNameReResult = fileNameRe.exec(headers['content-disposition'])
            if (fileNameReResult) 
                parsedInfo.name = fileNameReResult[1] // could be undefined
        } 
        if (!parsedInfo.name) {
            if (url.indexOf(this.urlDoubleSpliter) !== -1) {
                const parts = url.split(this.urlDoubleSpliter)
                url = parts[parts.length - 1]
            }
            if (url.indexOf(this.urlSpliter) !== -1 && !url.endsWith(this.urlSpliter)) {
                const parts = url.split(this.urlSpliter)
                const part = parts[parts.length - 1]
                if (part.indexOf(this.fileExtensionDot) !== -1) {
                    parsedInfo.name = part
                } else {
                    parsedInfo.name = part + this.fileExtensionDot + parsedInfo.subType
                }
            } else {
                parsedInfo.name = parsedInfo.type + this.fileExtensionDot + parsedInfo.subType
            }
        }
        // file's size
        if (statusCode === 200) {
            if (headers['content-length']) {
                parsedInfo.size = parseInt(headers['content-length'])
            } else { // chunk
                parsedInfo.size = -1
            } 
        } else { // statusCode === 206
            if (headers['content-range']) {
                const parts = headers['content-range'].split(this.contentSpliter)
                try {
                    parsedInfo.size = parseInt(parts[1])
                } catch (error: any) {
                    parsedInfo.size = -1
                }
            } else {
                parsedInfo.size = -1
            }
        }
        // file's createAt time
        if (headers['last-modified']) {
            parsedInfo.createAt = new Date(headers['last-modified']).toISOString()
        }
        // isRange
        if (statusCode === 206) {
            parsedInfo.isRange = true
        } else {
            parsedInfo.isRange = false
        }
        parsedInfo.location = setting.location
        parsedInfo.useProxy = false
        return parsedInfo
    }

    getParserTarget = (): string => this.parseTarget

    getDownloadOptions = ({ parsedInfo, handleInfoChange } : 
        { parsedInfo: {[key: string]: any}, handleInfoChange: React.ChangeEventHandler<HTMLInputElement> }): React.ReactElement => {
        return (
            <React.Fragment>
                <InfoRow>
                    <label>File name: </label>
                    <input className="resource-name" type="text" value={parsedInfo.name} name='name' onChange={handleInfoChange} />
                </InfoRow>
                <InfoRow>
                    <label>Location: </label>
                    <input className="download-location" type="text" value={parsedInfo.location} name='location' onChange={handleInfoChange} />
                    <label>{parsedInfo.size > 0 ? parsedInfo.size : ''}</label>
                </InfoRow>
                <InfoRow>
                    <label>Use proxy? </label>
                    <input className="use-proxy" type="checkbox" checked={parsedInfo.useProxy} name='useProxy' onChange={handleInfoChange} />
                </InfoRow>
            </React.Fragment>
        )
    }

    addTask = (parsedInfo: {[key: string]: any}): void => {
        const task = new Task()
        task.name = parsedInfo.name
        task.size = parsedInfo.size
        task.type = parsedInfo.type
        task.url = parsedInfo.url
        task.downloadUrl = parsedInfo.downloadUrl
        task.createAt = parsedInfo.createAt
        task.subType = parsedInfo.subType
        task.charset = parsedInfo.charset
        task.location = parsedInfo.location
        task.isRange = parsedInfo.isRange
        task.useProxy = parsedInfo.useProxy
        task.parserNo = this.parserNo
        ipcRenderer.send('add-task', task)
    }
}

export default DefaultParser