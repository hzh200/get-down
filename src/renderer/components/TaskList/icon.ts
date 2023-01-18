import * as Icon from './svgs'

const TYPE_CLASS = new Map([
    ['mp4', 'video'],
    ['mkv', 'video'],
    ['flv', 'video'],
    ['mp3', 'audio'],
    ['m4a', 'audio'],
    ['png', 'image'],
    ['jpg', 'image'],
    ['webm', 'image'],
    ['jiff', 'image'],
    ['svg', 'image'],
    ['zip', 'zipper'],
    ['7z', 'zipper'],
    ['rar', 'zipper'],
    ['pdf', 'pdf'],
    ['doc', 'word'],
    ['docx', 'word'],
    ['xlsx', 'excel'],
    ['ppt', 'powerpoint'],
    ['csv', 'csv'],
    ['c', 'code'],
    ['cpp', 'code'],
    ['py', 'code'],
    ['java', 'code'],
    ['js', 'code'],
    ['go', 'code'],
    ['php', 'code'],
    ['cs', 'code'],
    ['sh', 'code'],
    ['html', 'code'],
    ['css', 'code']
])

const ICON_TYPE = new Map([
    ['video', Icon.video],
    ['audio', Icon.audio],
    ['image', Icon.image],
    ['zipper', Icon.zipper],
    ['pdf', Icon.pdf],
    ['word', Icon.word],
    ['excel', Icon.excel],
    ['powerpoint', Icon.powerpoint],
    ['csv', Icon.csv],
    ['code', Icon.code]
])

const getTaskIconPath = (type: string): string => {
    if (TYPE_CLASS.has(type)) {
        return ICON_TYPE.get(TYPE_CLASS.get(type) as string)
    } else {
        return Icon.file
    }
}

const getTaskSetIconPath = (isOpen: boolean): string => {
    if (isOpen) {
        return Icon.openFolder
    } else {
        return Icon.folder
    }
}

export { getTaskIconPath, getTaskSetIconPath }