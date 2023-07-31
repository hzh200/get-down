import * as http from 'node:http';
import { ProxySetting } from 'get-proxy-settings';
import { Log, ProxyChooses } from '../../utils';
import { globalSetting } from '../../global/setting';
import { Protocol, Header } from '../constants';
import { getHeaders } from '../headers';
import { fetchSystemProxySetting } from './proxy';
import { isDev } from '../../global/runtime_mode';

const setOptionProxyed = (options: http.RequestOptions, host: string, port: number): void => {
    options.protocol = Protocol.HTTPProtocol;
    options.host = host;
    options.port = port;
};

const setOptionDirected = (options: http.RequestOptions, url: string, headers: http.OutgoingHttpHeaders): void => {
    if (url.startsWith(Protocol.HTTPProtocol)) {
        options.protocol = Protocol.HTTPProtocol;
    } else { // https://
        options.protocol = Protocol.HTTPSProtocol;
    } // extractor_page filtered other possibilities.

    options.host = headers[Header.Host] as string;
    options.port = undefined;
};

const generateRequestOption = async (url: string, getHeaders: getHeaders, additionHeaders?: http.OutgoingHttpHeaders): Promise<http.RequestOptions> => {
    const options: http.RequestOptions = {
        protocol: '',
        host: '',
        port: -1,
        path: '',
        headers: {
            Host: ''
        }
    };

    let headers: http.OutgoingHttpHeaders = getHeaders(url);
    if (additionHeaders) {
        headers = {
            ...headers,
            ...additionHeaders
        };
    }
    if (globalSetting.proxy.proxyChoosen === ProxyChooses.SetManually && globalSetting.proxy.host && globalSetting.proxy.port) {
        setOptionProxyed(options, globalSetting.proxy.host, globalSetting.proxy.port);
    } else if (globalSetting.proxy.proxyChoosen === ProxyChooses.UseSystemProxy) {
        try {
            const proxySetting: ProxySetting = await fetchSystemProxySetting();
            setOptionProxyed(options, proxySetting.host, parseInt(proxySetting.port));
        } catch (error: any) { // no system proxy exists.
            setOptionDirected(options, url, headers);
        }
    } else { // ProxyChooses.NoProxy
        setOptionDirected(options, url, headers);
    }
    options.path = url;
    options.headers = headers;
    if (isDev) {
        Log.info(`Generated options: ${JSON.stringify(options)}`);
    }
    return options;
};

export { generateRequestOption };