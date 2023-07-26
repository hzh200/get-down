import * as React from 'react';
import * as http from 'node:http';
import * as path from 'node:path';
import { Parser, ParsedInfo, DownloadOptionsBase } from '../interfaces/parser';
import InfoRow from '../InfoRow';
import { Task, DownloadType, TaskSet } from '../../global/models';
import { Setting, readSetting, matchOne } from '../../utils';
import { ipcRenderer } from 'electron';
import { CommunicateAPIName } from '../../global/communication';
import { requestPage, PreflightInfo, preflight } from '../../http/functions';
import { Header, FILE_EXTENSION_DOT } from '../../http/constants';
import Bilibili from './bilibili';

const BV_RE = new RegExp('BV[a-zA-Z0-9]+');
const Web_INTERFACE_API = 'https://api.bilibili.com/x/web-interface/view';
const PLAYER_API = 'https://api.bilibili.com/x/player/playurl';

class BiliBiliParsedInfo extends ParsedInfo {
    url: string;
    listInfo: ListInfo;
    listCount: number;
    declare name: string;
    declare location: string;

    selection: Selection;
}

class ListInfo {
    bvid: string;
    aid: string;
    title: string;
    publishedTimestamp: string;
    videos: Array<VideoInfo> = [];
}

class VideoInfo {
    cid: string;
    title: string;
    formats: Array<FormatInfo> = [];
}

class FormatInfo {
    quality: string;
    format: string;
    display: string;
    description: string;
    urls: Array<FormatInfoUrl> = [];
}

type FormatInfoUrl = string;

class Selection {
    selectedVideos: Array<boolean>;
    selectedFormats: Array<string>;
}

class BiliBiliParser extends Bilibili implements Parser {
    getListInfo = async (url: string): Promise<ListInfo> => {
        const videolist = new ListInfo();
        videolist.bvid = matchOne(BV_RE, url, 'no valid bv no found')[0];
        const rawData: string = await requestPage(`${Web_INTERFACE_API}?bvid=${videolist.bvid}`);
        const parsedData = JSON.parse(rawData);
        if (parsedData.code !== 0) {
            throw new Error('parsedData[\'code\'] = 0');
        }
        const data = parsedData.data;
        videolist.aid = data.aid;
        videolist.title = data.title;
        videolist.publishedTimestamp = data.pubdate;
        const pages = data.pages;
        for (const page of pages) {
            const video = new VideoInfo();
            video.cid = page.cid;
            video.title = page.part;
            video.formats = await this.getFormatInfos(videolist.aid, video.cid);
            videolist.videos.push(video);
        }
        return videolist;
    };

    getFormatInfos = async (aid: string, cid: string): Promise<Array<FormatInfo>> => {
        const rawData: string = await requestPage(`${PLAYER_API}?avid=${aid}&cid=%20${cid}`);
        const parsedData = JSON.parse(rawData);
        const data = parsedData.data;
        const supportFormats = data.support_formats;
        const formats: Array<FormatInfo> = [];
        for (const val of supportFormats) {
            const format = new FormatInfo();
            format.quality = val.quality;
            format.format = val.format;
            format.description = val.new_description;
            format.display = val.display_desc;
            format.urls = await this.getVideoURLs(aid, cid, format.quality);
            formats.push(format);
        }
        return formats;
    };

    getVideoURLs = async (aid: string, cid: string, quality: string): Promise<Array<FormatInfoUrl>> => {
        const rawData: string = await requestPage(`${PLAYER_API}?avid=${aid}&cid=%20${cid}&qn=${quality}`);
        const parsedData = JSON.parse(rawData);
        const data = parsedData.data;
        const durl = data.durl;
        const urls: Array<FormatInfoUrl> = [];
        for (const url of durl) {
            urls.push(url.url);
        }
        return urls;
    };

    parse = async (url: string): Promise<ParsedInfo> => {
        const setting: Setting = readSetting();
        const videolist: ListInfo = await this.getListInfo(url);
        const parsedInfo = new BiliBiliParsedInfo();
        parsedInfo.url = url;
        parsedInfo.listInfo = videolist;
        parsedInfo.listCount = videolist.videos.length;
        parsedInfo.name = videolist.title;
        parsedInfo.location = setting.location;
        parsedInfo.selection = new Selection();
        parsedInfo.selection.selectedVideos = Array(parsedInfo.listCount).fill(true);
        parsedInfo.selection.selectedFormats = Array(parsedInfo.listCount).fill('');
        for (let i = 0; i < parsedInfo.listCount; i++) {
            parsedInfo.selection.selectedFormats[i] = parsedInfo.listInfo.videos[i].formats[0].quality;
        }
        return parsedInfo;
    };

    DownloadOptions = ({ parsedInfo, handleInfoChange }:
        { parsedInfo: BiliBiliParsedInfo, handleInfoChange: React.ChangeEventHandler<HTMLElement> }): React.ReactElement => {
        if (parsedInfo.listCount === 1) {
            return (
                <React.Fragment>
                    <DownloadOptionsBase parsedInfo={parsedInfo} handleInfoChange={handleInfoChange} />
                    <InfoRow>
                        <label>Quality</label>
                        <select className="format-selecter" value={parsedInfo.selection.selectedFormats[0]} name='selection-selectedFormats-0' onChange={handleInfoChange}>
                            {parsedInfo.listInfo.videos[0].formats.map((format: FormatInfo, index: number, _array: Array<FormatInfo>) =>
                                <option value={format.quality} key={index}>{format.description}</option>
                            )}
                        </select>
                    </InfoRow>
                </React.Fragment>
            );
        } else {
            return (
                <React.Fragment>
                    <InfoRow>
                        <label>Folder name:</label>
                        <input className="resource-name" type="text" value={parsedInfo.name} name='name' onChange={handleInfoChange} />
                    </InfoRow>
                    <InfoRow>
                        <label>Location:</label>
                        <input className="download-location" type="text" value={parsedInfo.location} name='location' onChange={handleInfoChange} />
                    </InfoRow>
                    <InfoRow>
                        <label>Video:</label>
                        <div>
                            {parsedInfo.listInfo.videos.map((video: VideoInfo, index) =>
                                <div key={index}>
                                    <input className="video-select" type="checkbox" checked={parsedInfo.selection.selectedVideos[index]} name={`selection-selectedVideos-${index}`} onChange={handleInfoChange} />
                                    <label>{video.title}</label>
                                    <select className="format-selecter" value={parsedInfo.selection.selectedFormats[index]} name={`selection-selectedFormats-${index}`} onChange={handleInfoChange}>
                                        {video.formats.map((format: FormatInfo, index) => <option value={format.quality} key={index}>{format.description}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    </InfoRow>
                </React.Fragment>
            );
        }
    };

    addTask = async (parsedInfo: BiliBiliParsedInfo): Promise<void> => {
        if (parsedInfo.listCount === 1) {
            let targetFormat: FormatInfo = parsedInfo.listInfo.videos[0].formats[0];
            for (const format of parsedInfo.listInfo.videos[0].formats) {
                if (format.quality === parsedInfo.selection.selectedFormats[0]) {
                    targetFormat = format;
                    break;
                }
            }
            const preflightParsedInfo: PreflightInfo = await preflight(targetFormat.urls[0], this.requestHeaders);

            const task = new Task();
            task.name = parsedInfo.name + FILE_EXTENSION_DOT + preflightParsedInfo.subType;
            task.size = preflightParsedInfo.size;
            task.type = preflightParsedInfo.type;
            task.url = parsedInfo.url;
            task.downloadUrl = preflightParsedInfo.downloadUrl;
            task.publishedTimestamp = parsedInfo.listInfo.publishedTimestamp.toString();
            task.subType = preflightParsedInfo.subType;
            task.charset = preflightParsedInfo.charset;
            task.location = parsedInfo.location;
            task.downloadType = preflightParsedInfo.downloadType;
            task.extractorNo = this.extractorNo;
            ipcRenderer.send(CommunicateAPIName.AddTask, task);
        } else {
            const tasks: Array<Task> = [];
            for (let i = 0; i < parsedInfo.listCount; i++) {
                if (!parsedInfo.selection.selectedVideos[i]) continue;
                for (const format of parsedInfo.listInfo.videos[i].formats) {
                    if (format.quality === parsedInfo.selection.selectedFormats[i]) {
                        const preflightParsedInfo: PreflightInfo = await preflight(format.urls[0], this.requestHeaders);

                        const task = new Task();
                        task.name = parsedInfo.listInfo.videos[i].title + FILE_EXTENSION_DOT + preflightParsedInfo.subType;
                        task.size = preflightParsedInfo.size;
                        task.type = preflightParsedInfo.type;
                        task.url = preflightParsedInfo.url;
                        task.downloadUrl = preflightParsedInfo.downloadUrl;
                        task.publishedTimestamp = parsedInfo.listInfo.publishedTimestamp.toString();
                        task.subType = preflightParsedInfo.subType;
                        task.charset = preflightParsedInfo.charset;
                        task.location = path.join(parsedInfo.location, parsedInfo.name);
                        task.downloadType = preflightParsedInfo.downloadType;
                        task.extractorNo = this.extractorNo;
                        tasks.push(task);
                        break;
                    }
                }
            }
            const taskSet = new TaskSet();
            taskSet.name = parsedInfo.name;
            taskSet.size = 0;
            for (const task of tasks) {
                if (!task.size) {
                    taskSet.size = undefined;
                    break;
                }
                taskSet.size += task.size;
            }
            taskSet.type = 'folder';
            taskSet.url = parsedInfo.url;
            taskSet.location = parsedInfo.location;
            taskSet.extractorNo = this.extractorNo;

            ipcRenderer.send(CommunicateAPIName.AddTaskSet, [taskSet, tasks]);
        }
    };
}

export default BiliBiliParser;