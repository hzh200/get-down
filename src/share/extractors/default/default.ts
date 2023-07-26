import ExtractorInfo from '../interfaces/extractorInfo'

class Default implements ExtractorInfo {
    extractorNo: number = 0
    extractTarget: string = 'http'
    host: string = ''
}

export default Default