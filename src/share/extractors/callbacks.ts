import { Callback } from './interfaces/callback';
import ExtractorInfo from './interfaces/extractorInfo';
import DefaultCallback from './default/default_callback';
import BiliBiliCallback from './bilibili/bilibili_callback';
import YouTubeCallback from './youtube/youtube_callback';

const callbacks: Array<Callback> = [
    new DefaultCallback(),
    new BiliBiliCallback(),
    new YouTubeCallback()
];

const callbackModule = {
    index: 0,
    getCallback(index: number): Callback {
        return callbacks[index];
    }
};

export default callbackModule;
export { ExtractorInfo, Callback };
