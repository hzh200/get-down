import { ipcRenderer, IpcRendererEvent } from 'electron'
import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import OperationBar from './operationBar'
import TaskList from './taskList'
import ParserPage from '../parserPage/parser_page'
import SettingPage from '../settingPage/setting_page'
import Popup from '../../Popup/popup'

import { Task, TaskSet, TaskItem, TaskStatus } from '../../../common/models'
import './global.css'

function MainPage() {
    const [taskItems, setTaskItems] = React.useState<Array<TaskItem>>([])
    const [showParserWindow, setShowParserWindow] = React.useState<boolean>(false)
    const [showSettingWindow, setShowSettingWindow] = React.useState<boolean>(false)
    React.useEffect(() => {
        // Update taskItems for showing up.
        ipcRenderer.on('new-task-item', (_event, updateTaskItem: TaskItem) => {
            setTaskItems(taskItems => taskItems.concat(updateTaskItem))
        })
        ipcRenderer.on('update-task-item', (_event, updateTaskItem: TaskItem) => {
            setTaskItems(taskItems => {
                let newTaskItems: Array<TaskItem> = [ ...taskItems ]
                for (let i = 0; i < newTaskItems.length; i++) {
                    if (newTaskItems[i].taskNo === updateTaskItem.taskNo) {
                        newTaskItems[i] = updateTaskItem
                        break
                    }
                }
                return newTaskItems
            })
        })
    }, [])

    // Popup visibility control.
    // There is no need to add checking if another popup is already shown, 
    // when a popup is shown, a user can't click on main page buttons anymore, 
    // and there is no show-popup function exists on popups.
    const openParser: React.MouseEventHandler<HTMLDivElement> = (): void => {
        setShowParserWindow(true)
    }
    const openSetting: React.MouseEventHandler<HTMLDivElement> = (): void => {
        setShowSettingWindow(true)
    }
    // Workflow control.
    const play: React.MouseEventHandler<HTMLDivElement> = () => {

    }
    const pause: React.MouseEventHandler<HTMLDivElement> = () => {

    }
    const trash: React.MouseEventHandler<HTMLDivElement> = () => {

    }

    return (
        <div className="main-container">
            <OperationBar play={play} pause={pause} trash={trash} openParser={openParser} openSetting={openSetting} />
            <TaskList tasks={taskItems} />
            <Popup showPopup={showParserWindow} setShowPopup={setShowParserWindow}>
                <ParserPage />
            </Popup>
            <Popup showPopup={showSettingWindow} setShowPopup={setShowSettingWindow}>
                <SettingPage />
            </Popup>
        </div>
    )
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<MainPage />);