const URL_REGEX = new RegExp('^(https?):\/\/[-A-Za-z0-9+&@#\/%?=~_|!:,.;]+[-A-Za-z0-9+&@#\/%=~_|]')

const validateUrl = (url: string): boolean => {
    if (URL_REGEX.exec(url)) {
        return true
    }
    return false
}

export { URL_REGEX, validateUrl }