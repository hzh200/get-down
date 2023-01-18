import * as http from 'node:http'
import { ProxySetting } from 'get-proxy-settings'
import { ProxyChooses } from '../../utils'
import { globalSetting } from '../../global'
import { Protocol, Header } from '../constants'
import { getHeaders, getPreflightHeaders, getDownloadHeaders } from './header'
import { fetchSystemProxySetting } from './proxy'

const setOptionProxy = (options: http.RequestOptions, host: string, port: number): void => {
    options.protocol = Protocol.HTTPProtocol
    options.host = host
    options.port = port
}

const setOptionDirect = (options: http.RequestOptions, url: string, headers: http.OutgoingHttpHeaders): void => {
    if (url.startsWith(Protocol.HTTPProtocol)) {
        options.protocol = Protocol.HTTPProtocol
    } else { // https://
        options.protocol = Protocol.HTTPSProtocol
    } // parser_page filtered other possibilities.

    options.host = headers[Header.Host] as string
    options.port = undefined
}

const generateRequestOption = async (url: string, getHeaders: getHeaders, additionHeaders?: http.OutgoingHttpHeaders): Promise<http.RequestOptions> => {
    const options: http.RequestOptions = {
        protocol: '',
        host: '',
        port: -1,
        path: '',
        headers: {
            Host: ''
        }
    }

    let headers: http.OutgoingHttpHeaders = getHeaders(url)
    if (additionHeaders) {
        headers = {
            ...headers,
            ...additionHeaders
        }
    }
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

export { generateRequestOption, getHeaders, getPreflightHeaders, getDownloadHeaders }