import { utimes } from "utimes"
import { Log } from "./filesystem/log"

const TIMESTAMP_LENGTH_FOR_UTIME = 13

// can noly be used with main process.
const changeFileTimestamp = async (path: string, publishedTimestamp: string): Promise<void> => {
    if (publishedTimestamp.length > TIMESTAMP_LENGTH_FOR_UTIME) {
        publishedTimestamp = publishedTimestamp.substring(0, TIMESTAMP_LENGTH_FOR_UTIME)
    } else if (publishedTimestamp.length < TIMESTAMP_LENGTH_FOR_UTIME) {
        publishedTimestamp = publishedTimestamp.concat(Array(TIMESTAMP_LENGTH_FOR_UTIME - publishedTimestamp.length).fill('0').join(''))
    }
    const timestamp = parseInt(publishedTimestamp)
    try {
        await utimes(path, {
            btime: timestamp,
            mtime: timestamp,
            atime: undefined
        })
    } catch (e: any) {
        Log.errorLog(e)
    }
}

export { changeFileTimestamp }