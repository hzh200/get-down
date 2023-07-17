import { Log } from '../filesystem/log'

const matchOne = (re: RegExp, data: string, failureNotice?: string): RegExpExecArray => {
    const execResult: RegExpExecArray | null = re.exec(data)
    if (!execResult) {
        Log.error(re + ' ' + data)
        throw new Error(failureNotice ? failureNotice : 'no exec result')
    }
    return execResult
}

const matchAll = (re: RegExp, data: string, failureNotice?: string): Array<RegExpExecArray> => {
    const execResults: Array<RegExpExecArray> = []
    let execResult: RegExpExecArray | null
    while ((execResult =  re.exec(data)) !== null) {
        execResults.push(execResult)
    }
    
    if (execResults.length === 0) {
        Log.error(re + ' ' + data)
        throw new Error(failureNotice ? failureNotice : 'no exec result')
    }
    return execResults
}

export { matchOne, matchAll }