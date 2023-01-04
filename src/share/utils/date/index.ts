const getLocaleDateString = (datetimeString: string): string => {
    const date = new Date(datetimeString)
    return date.toLocaleDateString()
}

export { getLocaleDateString }