import { Log } from './filesystem/log'

const handlePromise = async <T>(promise: Promise<T>): Promise<[Error | undefined, T]> => {
    let res: [Error | undefined, T | undefined] // typescript tuple
    try {
        res = [undefined, await promise]
    } catch (error: any) {
        res = [error, undefined]
    }
    return res as [Error | undefined, T]
}

const handleAsyncCallback = (func: (...args: Array<any>) => Promise<void>): (...args: Array<any>) => Promise<void> => {
    return async (...args: Array<any>) => {
        try {
            await func(...args)
        } catch (error: any) {
            Log.errorLog(error)
        }
    }
}

export { handlePromise, handleAsyncCallback }