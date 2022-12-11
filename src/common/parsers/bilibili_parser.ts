import { Parser } from './index'
import DefaultParser from './default_parser'

class BiliBiliParser extends DefaultParser implements Parser {
    parserNo = 1

    constructor() {
        super()
    }

    parseTarget = 'bilibili'
}

export default BiliBiliParser