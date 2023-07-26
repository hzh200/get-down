import { getProxySettings, ProxySettings, ProxySetting } from 'get-proxy-settings';

// ProxySetting { protocol: 'http', host: '127.0.0.1', port: '7890' }
const fetchSystemProxySetting = async (): Promise<ProxySetting> => {
    const proxy = await getProxySettings() as ProxySettings;
    if (!proxy) {
        throw new Error('No system proxy found.');
    }
    // console.log(proxy.http, proxy.https)
    return proxy.http as ProxySetting;
};

export { fetchSystemProxySetting };