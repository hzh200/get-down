import * as vm from 'node:vm';
import * as querystring from 'node:querystring';
import { matchOne } from '../../utils';

const ESCAPING_PAIRS = [
    { start: '\'', end: '\''},
    { start: '\"', end: '\"'},
    { start: '\`', end: '\`'},
    { start: '\/', end: '\/', startPrefix: /(^|[\[{:;,/])\s?$/}, // '\/' doesn't always indicating regex, so it's a special case.
];

const extractFunctionBody = (rawData: string): string => {
    const [targetStart, targetEnd] = '{}';
    let count = 0;
    let escapingPairIndex = -1;
    let startIndex, endIndex;
    let isEscaped = false; // Only used when 'escapingPairIndex' needs updating, needed to update at every iteration.
    for (let i = 0; i < rawData.length; i++) {
        const byte = rawData[i];
        // Unsetting 'escapingPairIndex', must be operated before setting 'escapingPairIndex'.
        if (escapingPairIndex !== -1 && byte === ESCAPING_PAIRS[escapingPairIndex].end && !isEscaped) {
            escapingPairIndex = -1;
            continue;
        }
        // Setting 'escapingPairIndex'.
        const pairResult = ESCAPING_PAIRS.find((pair) => byte === pair.start && (!pair.startPrefix || rawData.substring(i - 10, i).match(pair.startPrefix)));
        if (escapingPairIndex === -1 && pairResult && !isEscaped) {
            escapingPairIndex = ESCAPING_PAIRS.indexOf(pairResult);
            continue;
        }

        // Update 'isEscape'.
        isEscaped = byte === '\\' && !isEscaped;

        if (escapingPairIndex !== -1) {
            continue;
        }
        if (byte === targetStart) {
            if (count === 0) {
                startIndex = i;
            }
            count++;
        } else if (byte === targetEnd) {
            count--;
            if (count === 0) {
                endIndex = i;
                break;
            }
        }
    }

    if (!endIndex) {
        throw new Error(`No function is extracted. ${startIndex}-${endIndex}`);
    }
    return rawData.substring(startIndex as number, endIndex + 1);
};

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

const decipherSignature = (html5player: string, signatureCipher: string): string => {
    const functions: Array<string> = extractDecipherFunctions(html5player)
    const decipherFunctionJSScript = new vm.Script(functions[0])
    const nTransformJSScript = functions.length > 1 ? new vm.Script(functions[1]) : undefined
    return getDecipheredUrl(signatureCipher, decipherFunctionJSScript, nTransformJSScript)
}

//
// (b=String.fromCharCode(110),c=a.get(b))&&(c=qDa[0](c),a.set(b,c),qDa.length||oma(""))}};
//
// var qDa=[oma];g.k=g.bM.prototype;g.k.CN=function(a){this.segments.push(a)};
//
// empty
//
// empty
//
// (b="nn"[+a.D],CL(a),c=a.j[b]||null)&&(c=KDa[0](c),a.set(b,c),KDa.length||Oma(""))

// new: (b=String.fromCharCode(110),c=a.get(b))&&(c=nfunc[idx](c)
// or:  (b="nn"[+a.D],c=a.get(b))&&(c=nfunc[idx](c)
// or:  (PL(a),b=a.j.n||null)&&(b=nfunc[idx](b)
// or:  (b="nn"[+a.D],vL(a),c=a.j[b]||null)&&(c=narray[idx](c),a.set(b,c),narray.length||nfunc("")
// old: (b=a.get("n"))&&(b=nfunc[idx](b)(?P<c>[a-z])\s*=\s*[a-z]\s*
// older: (b=a.get("n"))&&(b=nfunc(b)

const decipherN = (html5player: string, url: string): string => {
    try {
        const nRegexStr1 = String.raw`\(([a-zA-Z])=String\.fromCharCode\(110\)|([a-zA-Z])=\"nn\"\[\+[a-zA-Z]\.[a-zA-Z]\],([a-zA-Z])=[a-zA-Z]\.get\(\1\)\)&&\(\2=([a-zA-Z]*)\[([0-9]*)\]\(\2\)`
        const nRegexStr2 = String.raw`\(PL\(([a-zA-Z])\)\),([a-zA-Z])=\1\.[a-zA-Z]\.[a-zA-Z]\|\|null\)&&\(\2=[a-zA-Z]*\[([0-9]*)\]\(\2\)`
        const nRegexStr3 = String.raw`\(([a-zA-Z])=\"nn\"\[\+([a-zA-Z])\.[a-zA-Z]\],[a-zA-Z]*\(\2\),([a-zA-Z])=\2\.[a-zA-Z]\[\1\]\|\|null\)&&\(\3=[a-zA-Z]*\[[0-9]*\]\(\3\),\2\.set\(\1,\3\),[a-zA-Z]*\.length\|\|([a-zA-Z]*)\(\"\"\)`
        let functionName;
        try {
            functionName = matchOne(new RegExp(nRegexStr1), html5player)[3]
        } catch (error: any) {}
        try {
            functionName = matchOne(new RegExp(nRegexStr2), html5player)[3]
        } catch (error: any) {}
        try {
            functionName = matchOne(new RegExp(nRegexStr3), html5player)[4]
        } catch (error: any) {}
        if (!functionName) {
            throw new Error("no n function was found")
        }
        // const functionName = matchOne(new RegExp(String.raw`var\s*${functionParameterName}=\[(.*)\];`), html5player)[1]
        const functionHeader: string = `${functionName}=function(a)`
        const headerIdx = html5player.indexOf(functionHeader)
        if (headerIdx < 0) {
            throw new Error('decipher function not found')
        }
        const functionBody = extractFunctionBody(html5player.substring(headerIdx + functionHeader.length))
        const decipherFunction = `var ${functionHeader}${functionBody};${functionName}(n);`
        const urlComponents = new URL(decodeURIComponent(url))
        const newN = new vm.Script(decipherFunction).runInNewContext({ n: urlComponents.searchParams.get('n') })
        urlComponents.searchParams.set('n', newN)
        return urlComponents.toString()
    } catch (error: any) {
        throw error
    }
}

export {
    decipherSignature,
    decipherN
}