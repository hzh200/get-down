import * as http from 'node:http'
import { getProxySettings, ProxySettings, ProxySetting } from "get-proxy-settings"
import { ProxyChooses } from "../setting"
import { globalSetting } from "../global"
import { getHeaders } from '../http/header'

enum Protocol {
    HTTPProtocol = 'http:',
    HTTPSProtocol = 'https:'
}

// ProxySetting { protocol: 'http', host: '127.0.0.1', port: '7890' }
const fetchSystemProxySetting = async (): Promise<ProxySetting> => {
    const proxy = await getProxySettings() as ProxySettings
    if (!proxy) {
        throw new Error('No system proxy found.')
    }
    // console.log(proxy.http, proxy.https)
    return proxy.http as ProxySetting
}

const setOptionProxy = (options: http.RequestOptions, host: string, port: number): void => {
    options.protocol = Protocol.HTTPProtocol
    options.host = host
    options.port = port
}

const setOptionDirect = (options: http.RequestOptions, url: string, headers: http.OutgoingHttpHeaders): void => {
    if (url.startsWith('http://')) {
        options.protocol = Protocol.HTTPProtocol
    } else { // https://
        options.protocol = Protocol.HTTPSProtocol
    } // parser_page filtered other possibilities.

    options.host = headers['Host'] as string
    options.port = undefined
}

const generateRequestOption = async (url: string, getHeaders: getHeaders): Promise<http.RequestOptions> => {
    const options: http.RequestOptions = {
        protocol: '',
        host: '',
        port: -1,
        path: '',
        headers: {
            Host: ''
        }
    }

    const headers: http.OutgoingHttpHeaders = getHeaders(url)
    if (globalSetting.proxy.proxyChoosen === ProxyChooses.SetManually && globalSetting.proxy.host && globalSetting.proxy.port) {
        setOptionProxy(options, globalSetting.proxy.host, globalSetting.proxy.port)
    } else if (globalSetting.proxy.proxyChoosen === ProxyChooses.UseSystemProxy) {
        try {
            const proxySetting: ProxySetting = await fetchSystemProxySetting()
            setOptionProxy(options, proxySetting.host, parseInt(proxySetting.port))
        } catch (error: any) { // no system proxy exists.
            setOptionDirect(options, url, headers)
        }
    } else { // ProxyChooses.NoProxy
        setOptionDirect(options, url, headers)
    }
    options.path = url
    options.headers = headers
    return options
}

export { Protocol, generateRequestOption }