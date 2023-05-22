import { URL_REGEX, URL_ROUTER_SPLITER, URL_PROTOCOL_SPLITER, URL_PARAMETER_SPLITER } from './constants'

const validateUrl = (url: string): boolean => {
    return URL_REGEX.exec(url) ? true : false
}

const combineRelativePath = (url: string, relativePath: string): string => {
    if (relativePath.startsWith(URL_ROUTER_SPLITER)) {
        relativePath = relativePath.substring(1)
    }
    if (!url.includes(URL_ROUTER_SPLITER)) {
        return parseHost(url) + URL_ROUTER_SPLITER + relativePath
    }
    if (relativePath.includes(URL_ROUTER_SPLITER)) {
        const overlap = relativePath.split(URL_ROUTER_SPLITER)[0]
        return url.substring(0, url.indexOf(overlap)) + relativePath
    } else {
        const routerSpliterIndex = url.lastIndexOf(URL_ROUTER_SPLITER)
        return url.substring(0, routerSpliterIndex + 1) + relativePath 
    }
}

const parseHost = (url: string): string => {
    let temp: string = url.split(URL_PROTOCOL_SPLITER)[1]
    if (temp.includes(URL_ROUTER_SPLITER)) {
        return temp.split(URL_ROUTER_SPLITER)[0]
    } else if (temp.includes(URL_PARAMETER_SPLITER)) {
        return temp.split(URL_PARAMETER_SPLITER)[0]
    } else {
        return temp
    }
}

export { validateUrl, combineRelativePath, parseHost }