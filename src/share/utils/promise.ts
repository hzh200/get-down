const handlePromise = async <T>(promise: Promise<T>): Promise<[Error | undefined, T]> => {
    let res: [Error | undefined, T | undefined] // typescript tuple
    try {
        res = [undefined, await promise]
    } catch (error: any) {
        res = [error, undefined]
    }
    return res as [Error | undefined, T]
}

export { handlePromise }