const handlePromise = async <T>(promise: Promise<T>): Promise<[Error | undefined, T | undefined]> => {
    let r: [Error | undefined, T | undefined] // typescript tuple
    try {
        r = [undefined, await promise]
    } catch (error: any) {
        r = [error, undefined]
    }
    return r
}

export {
    handlePromise
}