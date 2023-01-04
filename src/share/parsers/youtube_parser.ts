import { Parser } from './index'
import DefaultParser from './default_parser'

class YoutubeParser extends DefaultParser implements Parser {
    parserNo = 2

    constructor() {
        super()
    }

    parseTarget = 'youtube'
}

export default YoutubeParser