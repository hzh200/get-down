enum Protocol {
    HTTPProtocol = 'http:',
    HTTPSProtocol = 'https:'
}

enum ResponseStatusCode {
    OK = 200,
    PartialContent = 206,
    MovedPermanently = 301,
    Found = 302,
    TemporaryRedirect = 307,
    PermanentRedirect = 308
}

class Header { // http.OutgoingHttpHeader // const Header: {[key: string]: string} = {}
    static UserAgent: string = 'User-Agent';
    static Accept: string = 'Accept';
    static AcceptEncoding: string = 'Accept-Encoding';
    static AcceptLanguage: string = 'Accept-Language';
    static Connection: string = 'Connection';
    static Range: string = 'Range';
    static Host: string = 'Host';
    static Referer: string = 'Referer';
    static ContentEncoding: string = 'content-encoding';
    static Location: string = 'location';
    static ContentType: string = 'content-type';
    static ContentDisposition: string = 'content-disposition';
    static ContentLength: string = 'content-length';
    static ContentRange: string = 'content-range';
    static LastModified: string = 'last-modified';
}

enum StreamEvent {
    Data = 'data',
    Error = 'error',
    End = 'end',
    Close = 'close'
}

enum Decoding {
    Gzip = 'gzip',
    Br = 'br',
    Deflate = 'deflate'
}

const URL_REGEX = new RegExp('^(https?):\/\/[-A-Za-z0-9+&@#\/%?=~_|!:,.;]+[-A-Za-z0-9+&@#\/%=~_|]');

const DIRECTIVE_SPLITER: string = ';';
const MEDIA_TYPE_SPLITER: string = '/';
const URL_ROUTER_SPLITER: string = '/';
const URL_PROTOCOL_SPLITER: string = '//';
const URL_PARAMETER_SPLITER: string = '?';
const FILE_EXTENSION_DOT: string = '.';
const ASSIGNMENT_SPLITER: string = '=';


export {
    Protocol, ResponseStatusCode, Header, StreamEvent, Decoding, URL_REGEX,
    DIRECTIVE_SPLITER, MEDIA_TYPE_SPLITER, URL_ROUTER_SPLITER, URL_PROTOCOL_SPLITER,
    URL_PARAMETER_SPLITER, FILE_EXTENSION_DOT, ASSIGNMENT_SPLITER
};
