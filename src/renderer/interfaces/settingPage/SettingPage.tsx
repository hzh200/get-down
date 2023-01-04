import * as React from 'react'
import { ProxyChooses, Setting, readSetting, writeSetting } from '../../../share/utils'
import { globalSetting } from '../../../share/global'
import './setting_page.css'
import { Log } from '../../../share/utils'

function SettingPage() {
    const [ setting, setSetting ] = React.useState<Setting>({...globalSetting})
    // readyToShow state is necessery because useEffect is asyncronized, 
    // returned Component depends on setting and setting needs time to be initialized by useEffect
    // const [ readyToShow, setReadyToShow ] = React.useState<boolean>(false)

    // the only place to change software setting
    // React.useEffect(() => {
    //     setInterval(() => {
    //         setSetting(globalSetting)
    //     }, 1000)
    // }, [])

    // const handleChange: React.ChangeEventHandler<HTMLInputElement> = async (event: React.ChangeEvent<HTMLInputElement>) => {
    //     const target: HTMLInputElement = (event.target as HTMLInputElement)
    //     let name: string = target.name
    //     let value: any = target.value
    //     if (name.includes('-')) {
    //         const [subName1, subName2] = name.split('-')
    //         name = subName1
    //         value = {
    //             ...setting[subName1],
    //             ...{
    //                 [subName2]: value
    //             }
    //         }
    //     }
    //     const newSetting = {
    //         ...setting,
    //         ...{
    //             [name]: value
    //         }
    //     }
    //     try {
    //         writeSetting(newSetting as Setting)
    //         setSetting(newSetting)
    //     } catch (error: any) {
    //         Log.errorLog(error)
    //     }
    // }

    const handleChange: React.ChangeEventHandler<HTMLInputElement> = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const target: HTMLInputElement = (event.target as HTMLInputElement)
        let name: string = target.name
        let value: any = target.value
        if (name === 'location') {
            globalSetting.location = value
        } else if (name.startsWith('proxy')) {
            if (name.endsWith('proxyChoosen')) {
                value = parseInt(value)
                globalSetting.proxy.proxyChoosen = value
            } else if (name.endsWith('host')) {
                globalSetting.proxy.host = value
            } else if (name.endsWith('port')) {
                globalSetting.proxy.port = value
            }
        } else if (name === 'trafficLimit') {
            globalSetting.trafficLimit = value
        }
        setSetting({...globalSetting})
        // try {
        //     writeSetting(newSetting as Setting)
        //     setSetting(newSetting)
        // } catch (error: any) {
        //     Log.errorLog(error)
        // }
    }

    return (
        <React.Fragment>
            <SettingItem title='location'>
                <SettingItemRow>
                    <p>location: </p>
                    <input type='text' size={30} value={setting['location']} name='location' onChange={handleChange} />
                </SettingItemRow>
            </SettingItem>
            <SettingItem title='proxy'>
                <SettingItemRow>
                    {/* <label>
                        <input type="radio" name="proxy-proxyChoosen" value={ProxyChooses.NoProxy} onChange={handleChange} checked={setting.proxy.proxyChoosen===ProxyChooses.NoProxy} />
                        No proxy.
                    </label> */}
                    {/*
                        Just like 'class', 'for' is a keyword in javascript so in JSX you can't use it directly. 
                        You must use htmlFor which is translated into for attribute once it is rendered to the DOM.
                    */}
                    <input type="radio" id='NoProxy' name="proxy-proxyChoosen" value={ProxyChooses.NoProxy} onChange={handleChange} checked={setting.proxy.proxyChoosen===ProxyChooses.NoProxy} />
                    <label htmlFor='NoProxy'>No proxy.</label>
                </SettingItemRow>
                <SettingItemRow>
                    <input type="radio" id='UseSystemProxy' name="proxy-proxyChoosen" value={ProxyChooses.UseSystemProxy} onChange={handleChange} checked={setting.proxy.proxyChoosen===ProxyChooses.UseSystemProxy} />
                    <label htmlFor='UseSystemProxy'>Use system proxy.</label>
                </SettingItemRow>
                <SettingItemRow>
                    <input type="radio" id='SetManually' name="proxy-proxyChoosen" value={ProxyChooses.SetManually} onChange={handleChange} checked={setting.proxy.proxyChoosen===ProxyChooses.SetManually} />
                    <label htmlFor='SetManually'>Set Manually.</label>
                </SettingItemRow>
                <SettingItemRow>
                    <p> Host: </p>
                    <input type='text' size={20} value={setting.proxy.host ? setting.proxy.host : ''} name='proxy-host' onChange={handleChange} />
                    <p> Port: </p>
                    <input type='text' size={10} value={setting.proxy.port ? setting.proxy.port : ''} name='proxy-port' onChange={handleChange} />
                </SettingItemRow>
            </SettingItem>
            <SettingItem title='Traffic Limit'>
                <SettingItemRow>
                    <p>Download Speed: </p>
                    <input type='text' size={8} value={setting.trafficLimit ? setting.trafficLimit : ''} name='trafficLimit' onChange={handleChange} />
                </SettingItemRow>
            </SettingItem>
        </React.Fragment>
        // </div>
    ) 
}

function SettingItem({ children, title }: { children: React.ReactElement | Array<React.ReactElement>, title: string }) {
    return (
        <div className='setting-item'>
            <div className='setting-item-title'><strong>{ title }</strong></div>
            { children }
        </div>
    )
}

function SettingItemRow({ children }: { children: React.ReactElement | Array<React.ReactElement> }) {
    return (
        <div className='setting-item-row'>
            { children }
        </div>
    )
}

export default SettingPage