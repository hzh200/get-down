const https = require('https')
const HttpsProxyAgent = require('https-proxy-agent')

class VideoInfo {
    title
    formats
    constructor() {
        this.formats = []
    }
}

class FormatInfo {
    url
    quality
    mimeType
    isAdaptive
}

const options = {
    headers: {
        'Referer': 'https://www.youtube.com',
        // Host:
        'User-Agent' : 'Chrome/97.0.4692.99',
        'Accept': '*/*',
        // 'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Connection': 'keep-alive',
        'Accept': '*/*',
        // 'Origin': 'https://www.youtube.com',
    }
}

class YoutubeParser {
    getYoutubeVideoList = (url, proxy) => {
        return new Promise(resolve => {
            const videoList = new VideoInfo()
            if (proxy !== undefined) {
                options.agent = new HttpsProxyAgent(proxy)
            }
            
            https.get(url, options, async (res) => {
                res.setTimeout(15000, () => {
                    resolve('parse timeout')
                })
                res.setEncoding('utf8')              
                let rawData = ''
                for await (const chunk of res) {
                    rawData += chunk
                }
                let rawLine = ''  
                for (const line of rawData.split('\n')) {
                    if (line.includes('streamingData')) {
                        rawLine = line
                        break
                    }
                }          
                if (rawLine === '') {
                    resolve('no valid video urls parsed out')
                    return
                }  
                const titleRE = new RegExp('<title>(.*) - YouTube<\/title>')
                videoList.title = titleRE.exec(rawData)[1]  
                const formatsRE = new RegExp('\"formats\".+?\]')
                if (formatsRE.exec(rawLine) === null) {
                    resolve('no valid video urls parsed out')
                    return
                }
                let parsedData = JSON.parse('{' + formatsRE.exec(rawLine)[0] + '}')  
                for (const data of parsedData.formats) {
                    const format = new FormatInfo()
                    // music
                    if (data.url === undefined) {
                        resolve('no valid video urls parsed out')
                        return
                    }
                    format.url = data.url
                    format.quality = data.qualityLabel
                    const tempSplits = data.mimeType.split('; ')
                    format.mimeType = tempSplits[0]
                    format.isAdaptive = true
            
                    videoList.formats.push(format)
                }    
                const adaptiveFormatsRE = new RegExp('\"adaptiveFormats\".+?\]')
                parsedData = JSON.parse('{' + adaptiveFormatsRE.exec(rawLine)[0] + '}') 
                for (const data of parsedData.adaptiveFormats) {
                    const format = new FormatInfo()
                    // music
                    if (data.url === undefined) {
                        resolve('no valid video urls parsed out')
                        return
                    }
                    format.url = data.url
                    format.quality = data.qualityLabel
                    const tempSplits = data.mimeType.split('; ')
                    format.mimeType = tempSplits[0]
                    format.isAdaptive = true
            
                    videoList.formats.push(format)
                }
                resolve(videoList)                  
            }).on('error', () => {
                resolve('request fail')
            })
        })
    }
}

module.exports = {
    YoutubeParser: YoutubeParser
}