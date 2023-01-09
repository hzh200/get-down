import * as path from 'node:path'

const DirPath: string = path.resolve(__dirname, '..')
const SrcPath: string = path.resolve(DirPath, 'src')
const BundlePath: string = path.resolve(DirPath, 'bundle')
const DBPath: string = path.join(BundlePath, 'database.sqlite')
const SettingPath: string = path.join(BundlePath, 'setting.json')
const LogPath: string = path.join(BundlePath, 'downloader.log')

export {
    DirPath,
    SrcPath,
    BundlePath,
    DBPath,
    SettingPath,
    LogPath
}