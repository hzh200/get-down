import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import { readSetting, writeSetting } from '../../../common/setting'
import './setting_page.css'

function SettingPage() {
    const [ setting, setSetting ] = React.useState<{[key: string]: any}>({})
    // readyToShow state is necessery because useEffect is asyncronized, 
    // returned Component depends on setting and setting needs time to be initialized by useEffect
    const [ readyToShow, setReadyToShow ] = React.useState<boolean>(false)
    React.useEffect(() => {
        try {
            setSetting(readSetting())
            setReadyToShow(true) 
        } catch (error: any) {

        }
    }, [])

    const handleChange: React.ChangeEventHandler<HTMLInputElement> = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const target: HTMLInputElement = (event.target as HTMLInputElement)
        let name: string = target.name
        let value: any = target.value
        if (name.includes('-')) {
            const [subName1, subName2] = name.split('-')
            name = subName1
            value = {
                ...setting[subName1],
                ...{
                    [subName2]: value
                }
            }
        }
        const newSetting = {
            ...setting,
            ...{
                [name]: value
            }
        }
        try {
            writeSetting(newSetting)
            setSetting(newSetting)
        } catch (error: any) {
            
        }
    }

    // JSON.stringify(setting) === '{}'
    if (readyToShow) {
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
                        <p>Host: </p>
                        <input type='text' size={20} value={setting['proxy']['host']} name='proxy-host' onChange={handleChange} />
                    </SettingItemRow>
                    <SettingItemRow>
                        <p>Port: </p>
                        <input type='text' size={10} value={setting['proxy']['port']} name='proxy-port' onChange={handleChange} />
                    </SettingItemRow>
                </SettingItem>
                <SettingItem title='Traffic Limit'>
                    <SettingItemRow>
                        <p>Download Speed: </p>
                        <input type='text' size={8} value={setting['trafficLimit']} name='trafficLimit' onChange={handleChange} />
                    </SettingItemRow>
                </SettingItem>
            </React.Fragment>
            // </div>
        ) 
    } else {
        return <div></div>
    }
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