import ExtractorInfo from "./extractorInfo"

interface Callback extends ExtractorInfo {
    taskCallback?(taskNo: number): Promise<void> // // for main process only.
    taskSetCallback?(taskNo: number): Promise<void> // a Parser may require a callback function only when it parses out a TaskSet
}

export { Callback }