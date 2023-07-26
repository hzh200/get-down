import * as http from 'node:http';
import { handleRedirectRequest, getHttpRequestTextContent } from './request';
import { getRequestPageHeaders } from '../options';
import { ResponseStatusCode } from '../constants';

const requestPage = async (url: string, additionHeaders?: http.OutgoingHttpHeaders): Promise<string> => {
    const [[request, res], _redirectUrl]: [[http.ClientRequest, http.IncomingMessage], string] = await handleRedirectRequest(url, getRequestPageHeaders, additionHeaders);
    const responseStatusCode: number | undefined = res.statusCode;
    if (!responseStatusCode || (responseStatusCode !== ResponseStatusCode.OK && responseStatusCode !== ResponseStatusCode.PartialContent)) {
        throw new Error(`Response status code ${responseStatusCode}`);
    }
    return await getHttpRequestTextContent(request, res);
};

export { requestPage };