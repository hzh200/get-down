import * as vm from 'node:vm'
import * as querystring from 'node:querystring'
import { matchOne } from '../../../utils'

const extractFunctionBody = (rawData: string): string => {
    const quotes = ['\'', '\"']
    const escape = '\\'
    const stack: Array<number> = []
    const range: Array<number> = []
    let quoteFlag = -1
    for (let i = 0; i < rawData.length; i++) {
        const byte = rawData[i]
        if (quotes.includes(byte) && (i == 0 || rawData[i - 1] !== escape)) {
            if (quoteFlag === quotes.indexOf(byte)) {
                quoteFlag = -1
            } else if (quoteFlag === -1) {
                quoteFlag = quotes.indexOf(byte)
            }
        } else if (quoteFlag === -1) {
            if (byte == '{') {
                stack.push(i)
            } else if (byte == '}') {
                if (stack.length === 1) {
                    range.push(stack.pop() as number)
                    range.push(i)
                    break
                } else {
                    stack.pop()
                }
            }
        }
    }
    return rawData.substring(range[0], range[1] + 1)
}

const extractDecipherFunctions = (html5player: string): Array<string> => {
    const functions: Array<string> = []

    const extractDecipherFunction = (): void => {
        const decipherFunctionName: string = matchOne(new RegExp('a\\.set\\(\\"alr\\",\\"yes\\"\\);c&&\\(c=\(.+?\)\\(decodeURIC'), html5player, 'no decipher function exec out')[1]
        const decipherFunctionHeader: string = `${decipherFunctionName}=function(a)`
        const headerIdx = html5player.indexOf(decipherFunctionHeader)
        if (headerIdx < 0) {
            throw new Error('decipher function not found')
        }
        const decipherFunctionBody = extractFunctionBody(html5player.substring(headerIdx + decipherFunctionHeader.length))
        
        const extractUsedObject = (): string => {
            const usedObjectName: string = matchOne(new RegExp('a=a\\.split\\(\\"\\"\\);\(.+?\)\\.'), decipherFunctionBody, 'no decipher function exec out')[1]
            const usedObjectDefinitionPart = `var ${usedObjectName}={`
            const headerIdx = html5player.indexOf(usedObjectDefinitionPart)
            if (headerIdx < 0) {
                return ''
            }
            const usedObjectBody = extractFunctionBody(html5player.substring(headerIdx + usedObjectDefinitionPart.length - 1))
            const usedObject = `var ${usedObjectName}=${usedObjectBody}`
            return usedObject
        }

        const decipherFunction = `${extractUsedObject()};var ${decipherFunctionHeader}${decipherFunctionBody};${decipherFunctionName}(sig);`
        functions.push(decipherFunction)
    }

    const extractNTransformerFunction = (): void => {
        let nTransformerFunctionName: string = ''
        try {
            nTransformerFunctionName = matchOne(new RegExp('&&\\(b=a\\.get\\(\\"n\\"\\)\\)&&\\(b=\(.+?\)\\(b\\)'), html5player)[1]
            if (nTransformerFunctionName.includes('[')) {
                nTransformerFunctionName = matchOne(new RegExp(`${nTransformerFunctionName.split('[')[0]}=\\[\(.+?\)\\]`), html5player)[1]
            }
        } catch (e: any) {
            return
        }

        const nTransformerFunctionHeader: string = `${nTransformerFunctionName}=function(a)`
        const headerIdx = html5player.indexOf(nTransformerFunctionHeader)
        if (headerIdx < 0) {
            return
        }
        const nTransformerFunctionBody = extractFunctionBody(html5player.substring(headerIdx + nTransformerFunctionHeader.length))
        const nTransformerFunction = `var ${nTransformerFunctionHeader}${nTransformerFunctionBody};${nTransformerFunctionName}(ncode);`
        functions.push(nTransformerFunction)
    }

    extractDecipherFunction()
    extractNTransformerFunction()
    return functions
}

const getDecipheredUrl = (signatureCipher: string, decipherFunctionJSScript: vm.Script, nTransformJSScript: vm.Script | undefined) => {
    const args = querystring.parse(signatureCipher)
    const urlComponents = new URL(decodeURIComponent(args.url as string))
    urlComponents.searchParams.set(args.sp ? args.sp as string : 'signature', decipherFunctionJSScript.runInNewContext({ sig: decodeURIComponent(args.s as string) }))
    if (urlComponents.searchParams.get('n') && nTransformJSScript) {
        urlComponents.searchParams.set('n', nTransformJSScript.runInNewContext({ ncode: urlComponents.searchParams.get('n') }))
    }
    return urlComponents.toString()
}

const decipherSignature = (html5player: string, signatureCipher: string) => {
    const functions: Array<string> = extractDecipherFunctions(html5player)
    const decipherFunctionJSScript = new vm.Script(functions[0])
    const nTransformJSScript = functions.length > 1 ? new vm.Script(functions[1]) : undefined
    return getDecipheredUrl(signatureCipher, decipherFunctionJSScript, nTransformJSScript)
}

export default decipherSignature