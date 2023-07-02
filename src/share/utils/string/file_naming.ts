import {escape, unescape} from 'html-escaper';

const WINDOWS_INVALID_NAMEING_CHARACTERS = ['\\', '/', ':', '*', '\?', '\"', '<', '>', '\|']

// const HTML_Escape_Character_NAME = new Map([
//     ['&quot;','\"'],
//     ['&amp;','\&'],
//     ['&lt;','\<'],
//     ['&gt;','\>'],
//     ['&nbsp;','\ '],
//     ['&copy;','\©'],
//     ['&reg;','\®'],
//     ['&Agrave;','\À'],
//     ['&Aacute;','\Á'],
//     ['&Acirc;','\Â'],
//     ['&Atilde;','\Ã'],
//     ['&Auml;','\Ä'],
//     ['&Aring;','\Å'],
//     ['&AElig;','\Æ'],
//     ['&Ccedil;','\Ç'],
//     ['&Egrave;','\È'],
//     ['&Eacute;','\É'],
//     ['&Ecirc;','\Ê'],
//     ['&Euml;','\Ë'],
//     ['&Igrave;','\Ì'],
//     ['&Iacute;','\Í'],
//     ['&Icirc;','\Î'],
//     ['&Iuml;','\Ï'],
//     ['&ETH;','\Ð'],
//     ['&Ntilde;','\Ñ'],
//     ['&Ograve;','\Ò'],
//     ['&Oacute;','\Ó'],
//     ['&Ocirc;','\Ô'],
//     ['&Otilde;','\Õ'],
//     ['&Ouml;','\Ö'],
//     ['&Oslash;','\Ø'],
//     ['&Ugrave;','\Ù'],
//     ['&Uacute;','\Ú'],
//     ['&Ucirc;','\Û'],
//     ['&Uuml;','\Ü'],
//     ['&Yacute;','\Ý'],
//     ['&THORN;','\Þ'],
//     ['&szlig;','\ß'],
//     ['&agrave;','\à'],
//     ['&aacute;','\á'],
//     ['&acirc;','\â'],
//     ['&atilde;','\ã'],
//     ['&auml;','\ä'],
//     ['&aring;','\å'],
//     ['&aelig;','\æ'],
//     ['&ccedil;','\ç'],
//     ['&egrave;','\è'],
//     ['&eacute;','\é'],
//     ['&ecirc;','\ê'],
//     ['&euml;','\ë'],
//     ['&igrave;','\ì'],
//     ['&iacute;','\í'],
//     ['&icirc;','\î'],
//     ['&iuml;','\ï'],
//     ['&eth;','\ð'],
//     ['&ntilde;','\ñ'],
//     ['&ograve;','\ò'],
//     ['&oacute;','\ó'],
//     ['&ocirc;','\ô'],
//     ['&otilde;','\õ'],
//     ['&ouml;','\ö'],
//     ['&oslash;','\ø'],
//     ['&ugrave;','\ù'],
//     ['&uacute;','\ú'],
//     ['&ucirc;','\û'],
//     ['&uuml;','\ü'],
//     ['&yacute;','\ý'],
//     ['&thorn;','\þ'],
//     ['&yuml;','\ÿ'],
//     ['&euro;','\?']
// ])

// const HTML_Escape_Character_CODE = new Map([
//     ['&#00;- &#08;','\ '],
//     ['&#09;','\ '],
//     ['&#10;','\ '],
//     ['&#11;','\ '],
//     ['&#32;','\ '],
//     ['&#33;','\!'],
//     ['&#34;','\"'],
//     ['&#35;','\#'],
//     ['&#36;','\$'],
//     ['&#37;','\%'],
//     ['&#38;','\&'],
//     ['&#39;','\''],
//     ['&#40;','\('],
//     ['&#41;','\)'],
//     ['&#42;','\*'],
//     ['&#43;','\+'],
//     ['&#44;','\,'],
//     ['&#45;','\-'],
//     ['&#46;','\.'],
//     ['&#47;','\/'],
//     ['&#48;- &#57;','\ '],
//     ['&#58;','\:'],
//     ['&#59;','\;'],
//     ['&#60;','\<'],
//     ['&#61;','\='],
//     ['&#62;','\>'],
//     ['&#63;','\?'],
//     ['&#64;','\@'],
//     ['&#65;- &#90;','\ '],
//     ['&#91;','\['],
//     ['&#92;','\\'],
//     ['&#93;','\]'],
//     ['&#94;','\^'],
//     ['&#95;','\_'],
//     ['&#96;','\`'],
//     ['&#97;-&#122;','\ '],
//     ['&#123;','\{'],
//     ['&#124;','\|'],
//     ['&#125;','\}'],
//     ['&#126;','\~'],
//     ['&#127;','\ '],
//     ['&#128;- &#129;','\ '],
//     ['&#130;','\‚'],
//     ['&#131;','\ƒ'],
//     ['&#132;','\„'],
//     ['&#133;','\…'],
//     ['&#134;','\†'],
//     ['&#135;','\‡'],
//     ['&#136;','\ˆ'],
//     ['&#137;','\‰'],
//     ['&#138;','\Š'],
//     ['&#139;','\‹'],
//     ['&#140;','\Œ'],
//     ['&#141;- &#144;','\ '],
//     ['&#145;','\‘'],
//     ['&#146;','\’'],
//     ['&#147;','\“'],
//     ['&#148;','\”'],
//     ['&#149;','\•'],
//     ['&#150;','\–'],
//     ['&#151;','\—'],
//     ['&#152;','\˜'],
//     ['&#153;','\™'],
//     ['&#154;','\š'],
//     ['&#155;','\›'],
//     ['&#156;','\œ'],
//     ['&#157;- &#158;','\ '],
//     ['&#159;','\Ÿ'],
//     ['&#160;','\ '],
//     ['&#161;','\¡'],
//     ['&#162;','\¢'],
//     ['&#163;','\£'],
//     ['&#164;','\¤'],
//     ['&#165;','\¥'],
//     ['&#166;','\¦'],
//     ['&#167;','\§'],
//     ['&#168;','\‥'],
//     ['&#169;','\©'],
//     ['&#170;','\ª'],
//     ['&#171;','\«'],
//     ['&#172;','\¬'],
//     ['&#173;','\­'],
//     ['&#174;','\®'],
//     ['&#175;','\¯'],
//     ['&#176;','\°'],
//     ['&#177;','\±'],
//     ['&#178;','\²'],
//     ['&#179;','\³'],
//     ['&#180;','\´'],
//     ['&#181;','\µ'],
//     ['&#182;','\¶'],
//     ['&#183;','\·'],
//     ['&#184;','\¸'],
//     ['&#185;','\¹'],
//     ['&#186;','\º'],
//     ['&#187;','\»'],
//     ['&#188;','\¼'],
//     ['&#189;','\½'],
//     ['&#190;','\¾'],
//     ['&#191;','\¿'],
//     ['&#192;','\À'],
//     ['&#193;','\Á'],
//     ['&#194;','\Â'],
//     ['&#195;','\Ã'],
//     ['&#196;','\Ä'],
//     ['&#197;','\Å'],
//     ['&#198;','\Æ'],
//     ['&#199;','\Ç'],
//     ['&#200;','\È'],
//     ['&#201;','\É'],
//     ['&#202;','\Ê'],
//     ['&#203;','\Ë'],
//     ['&#204;','\Ì'],
//     ['&#205;','\Í'],
//     ['&#206;','\Î'],
//     ['&#207;','\Ï'],
//     ['&#208;','\Ð'],
//     ['&#209;','\Ñ'],
//     ['&#210;','\Ò'],
//     ['&#211;','\Ó'],
//     ['&#212;','\Ô'],
//     ['&#213;','\Õ'],
//     ['&#214;','\Ö'],
//     ['&#215;','\×'],
//     ['&#216;','\Ø'],
//     ['&#217;','\Ù'],
//     ['&#218;','\Ú'],
//     ['&#219;','\Û'],
//     ['&#220;','\Ü'],
//     ['&#221;','\Ý'],
//     ['&#222;','\Þ'],
//     ['&#223;','\ß'],
//     ['&#224;','\à'],
//     ['&#225;','\á'],
//     ['&#226;','\â'],
//     ['&#227;','\ã'],
//     ['&#228;','\ä'],
//     ['&#229;','\å'],
//     ['&#230;','\æ'],
//     ['&#231;','\ç'],
//     ['&#232;','\è'],
//     ['&#233;','\é'],
//     ['&#234;','\ê'],
//     ['&#235;','\ë'],
//     ['&#236;','\ì'],
//     ['&#237;','\í'],
//     ['&#238;','\î'],
//     ['&#239;','\ï'],
//     ['&#240;','\ð'],
//     ['&#241;','\ñ'],
//     ['&#242;','\ò'],
//     ['&#243;','\ó'],
//     ['&#244;','\ô'],
//     ['&#245;','\õ'],
//     ['&#246;','\ö'],
//     ['&#247;','\÷'],
//     ['&#248;','\ø'],
//     ['&#249;','\ù'],
//     ['&#250;','\ú'],
//     ['&#251;','\û'],
//     ['&#252;','\ü'],
//     ['&#253;','\ý'],
//     ['&#254;','\þ'],
//     ['&#255;','\ÿ'],
//     ['&#8217;','\’'],
//     ['&#8220;','\“'],
//     ['&#8221;','\”'],
//     ['&#8364;','\?']
// ])

// const getUnescapedFilename = (filename: string): string => {
//     // HTML Encoding Escape Characters Replacement
//     for (const [key, val] of HTML_Escape_Character_NAME) {
//         filename = filename.replaceAll(key, val)
//     }
//     for (const [key, val] of HTML_Escape_Character_CODE) {
//         filename = filename.replaceAll(key, val)
//     }
//     while (filename.includes('  ')) {
//         filename = filename.replaceAll('  ', ' ')
//     }
//     return filename
// }

const getWindowsValidFilename = (filename: string): string => {
    filename = getUnescapedFilename(filename)
    // Windows Invalid Charaters Replacement
    for (const val of WINDOWS_INVALID_NAMEING_CHARACTERS) {
        filename = filename.replaceAll(val, '')
    }
    while (filename.includes('  ')) {
        filename = filename.replaceAll('  ', ' ')
    }
    return filename
} 

const getUnescapedFilename = (filename: string): string => {
    return unescape(filename);
}

export { getWindowsValidFilename, getUnescapedFilename }