enum ResponseStatusCode {
    OK = 200,
    PartialContent = 206,
    MovedPermanently = 301,
    Found = 302,
    TemporaryRedirect = 307,
    PermanentRedirect = 308
}

export { ResponseStatusCode }
