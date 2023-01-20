import * as fs from 'node:fs'
import * as path from 'node:path'

const isFFmpegInPath = () => {
    for (const value of (process as any).env['path'].split(';')) {
        if (fs.existsSync(path.join(value, 'ffmpeg.exe'))) {
            return true
        }
    }
    for (const name in process.env) {
        if (name === 'path') {
            continue
        }
        const values = process.env[name] as string
        for (const value of values.split(';')) {
            if (fs.existsSync(path.join(value, 'ffmpeg.exe'))) {
                return true
            }
        }
    }
}

export { isFFmpegInPath }