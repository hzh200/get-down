const urlRe = new RegExp('^(https?):\/\/[-A-Za-z0-9+&@#\/%?=~_|!:,.;]+[-A-Za-z0-9+&@#\/%=~_|]')

const validateUrl = (url: string): boolean => {
    if (urlRe.exec(url)) {
        return true
    }
    return false
}

export { urlRe, validateUrl }