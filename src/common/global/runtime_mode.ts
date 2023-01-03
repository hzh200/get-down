let isDev: boolean

const NODE_DEV: string | undefined = process.env.NODE_DEV
if (NODE_DEV === 'development') {
    isDev = true
} else if (NODE_DEV === 'production') {
    isDev = false
} else {
    isDev = true
}

export { isDev }