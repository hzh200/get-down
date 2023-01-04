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
    static UserAgent: string = 'User-Agent'
    static Accept: string = 'Accept'
    static AcceptEncoding: string = 'Accept-Encoding'
    static AcceptLanguage: string = 'Accept-Language'
    static Connection: string = 'Connection'
    static Range: string = 'Range'
    static Host: string = 'Host'
    static Referer: string = 'Referer'
    static ContentEncoding: string = 'content-encoding'
    static Location: string = 'location'
    static ContentType: string = 'content-type'
    static ContentDisposition: string = 'content-disposition'
    static ContentLength: string = 'content-length'
    static ContentRange: string = 'content-range'
    static LastModified: string = 'last-modified'
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

export { Protocol, ResponseStatusCode, Header, StreamEvent, Decoding }
