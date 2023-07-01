const findMaxOverlap = (str1: string, str2: string): string => {
    const dp = Array(str1.length + 1)
    for (let i =0; i <= str1.length; i++) {
        dp[i] = Array(str2.length + 1).fill(0)
    }
    let max = 0, left = -1, right = -1
    for (let i = 1; i <= str1.length; i++) {
        for (let j = 1; j <= str2.length; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1
                if (dp[i][j] > max) {
                    max = dp[i][j]
                    left = i - max
                    right = i
                }
            }
        }
    }
    return str1.substring(left, right)
}

export { findMaxOverlap }
export { getTUnescapedFilename, getWindowsValidFilename } from './file_naming'
export { matchOne, matchAll } from './regex'