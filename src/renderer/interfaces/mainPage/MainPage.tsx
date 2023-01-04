import { ipcRenderer, IpcRendererEvent, clipboard, shell } from 'electron'
import { Menu, MenuItem } from '@electron/remote'
import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import OperationBar from '../../components/OperationBar'
import TaskList from '../../components/TaskList'
import ParserPage from '../parserPage/ParserPage'
import SettingPage from '../settingPage/SettingPage'
import Popup from '../../components/Popup'
import * as path from 'node:path'
import { Task, TaskSet, TaskItem, TaskStatus, TaskField } from '../../../share/models'
import { CommunicateAPIName } from '../../../share/communication'
import './global.css'

function MainPage() {
    const [taskItems, setTaskItems] = React.useState<Array<TaskItem>>([])
    const [selectedRows, setSelectedRows] = React.useState<Array<number>>([])
    const [showParserWindow, setShowParserWindow] = React.useState<boolean>(false)
    const [showSettingWindow, setShowSettingWindow] = React.useState<boolean>(false)
    React.useEffect(() => {
        // Update taskItems for showing up.
        ipcRenderer.on(CommunicateAPIName.NewTaskItem, (_event: IpcRendererEvent, updateTaskItem: TaskItem) => {
            setTaskItems((taskItems: Array<TaskItem>) => taskItems.concat(updateTaskItem))
        })
        ipcRenderer.on(CommunicateAPIName.UpdateTaskItem, (_event: IpcRendererEvent, updateTaskItem: TaskItem) => {
            setTaskItems((taskItems: Array<TaskItem>) => {
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
    const play: React.MouseEventHandler<HTMLDivElement> = (_event: React.MouseEvent<HTMLDivElement>): void => {
        ipcRenderer.send(CommunicateAPIName.ResumeTasks, selectedRows)
    }
    const pause: React.MouseEventHandler<HTMLDivElement> = (_event: React.MouseEvent<HTMLDivElement>): void => {
        ipcRenderer.send(CommunicateAPIName.PauseTasks, selectedRows)
    }
    const trash: React.MouseEventHandler<HTMLDivElement> = (_event: React.MouseEvent<HTMLDivElement>): void => {
        ipcRenderer.send(CommunicateAPIName.DeleteTasks, selectedRows)
    }
    // React.MouseEventHandler<HTMLTableSectionElement>
    const onContextMenu: Function = (_event: React.MouseEvent<HTMLTableSectionElement>, taskNo: number): void => {
        const task: TaskItem = taskItems.filter((taskItem: TaskItem, _index: number, _array: Array<TaskItem>) => {
            return taskItem.taskNo === taskNo
        })[0]
        // Cannot use 'task instanceof Task', class type information is already lost during inter-process communication
        const isTaskType: boolean = (TaskField.location in task) && (TaskField.downloadUrl in task) // task instanceof Task
        selectRow(_event, taskNo)
        let menu = new Menu()
        menu.append(new MenuItem({ 
            label: 'pause', 
            click: () => pause(_event)
        }))
        menu.append(new MenuItem({ 
            label: 'resume', 
            click: () => play(_event)
        }))
        menu.append(new MenuItem({ 
            label: 'delete', 
            click: () => trash(_event)
        }))
        menu.append(new MenuItem({ type: 'separator' }))
        menu.append(new MenuItem({ 
            label: 'copy url', 
            click: () => clipboard.writeText(task.url, 'clipboard')
        }))
        if (isTaskType) {
            menu.append(new MenuItem({ 
                label: 'copy download url', 
                click: () => clipboard.writeText((task as Task).downloadUrl, 'clipboard')
            }))
        }
        menu.append(new MenuItem({ 
            label: 'copy filename', 
            click: () => clipboard.writeText(task.name, 'clipboard')
        }))
        menu.append(new MenuItem({ type: 'separator' }))
        if (isTaskType) {
            menu.append(new MenuItem({ 
                label: 'open file', 
                click: () => shell.openPath(path.join((task as Task).location, task.name))
            }))
            menu.append(new MenuItem({ 
                label: 'open file folder', 
                // click: () => shell.openPath(task.getDownloadDir())
                click: () => shell.showItemInFolder(path.join((task as Task).location, task.name))
            }))
            menu.append(new MenuItem({ type: 'separator' }))
        } 
        menu.append(new MenuItem({ 
            label: 'nothing', 
            type: 'checkbox',
            checked: true,
            click: () => clipboard.writeText(task.name, 'clipboard')
        }))
        menu.popup()
    }
    // React.MouseEventHandler<HTMLTableRowElement>
    const selectRow: Function = (event: React.MouseEvent<HTMLTableRowElement>, taskNo: number): void => {
        event.preventDefault()
        // const target: HTMLTableRowElement = event.target as HTMLTableRowElement
        // const taskNo: number = parseInt(target.parentElement?.children[0]?.innerHTML as string)
        let newSelectedRows: Array<number> = [...selectedRows]
        if ((window as any).event.ctrlKey) {
            if (newSelectedRows.includes(taskNo)) {
                newSelectedRows = newSelectedRows.filter((selectedTaskNo: number, _index: number, _array: Array<number>) => {
                    return selectedTaskNo !== taskNo
                })
            } else {
                newSelectedRows.push(taskNo)
            }
        } else {
            newSelectedRows = [taskNo]
        }
        setSelectedRows((_selectedRows: Array<number>) => {
            return newSelectedRows
        })
    }
    const selectAllRows: React.KeyboardEventHandler<HTMLTableSectionElement> = (event: React.KeyboardEvent<HTMLTableSectionElement>) => {
        event.preventDefault()
        if ((event.key === 'A' || event.key === 'a') && (window as any).event.ctrlKey) {
            setSelectedRows((_selectedRows: Array<number>) => {
                const newSelectedRows: Array<number> = taskItems.map(
                    (taskItem: TaskItem, _index: number, _array) => {
                        return taskItem.taskNo
                    }
                )
                return newSelectedRows
            })
        }
    }

    return (
        <div className="main-container">
            <OperationBar play={play} pause={pause} trash={trash} openParser={openParser} openSetting={openSetting} />
            <TaskList tasks={taskItems} selectedRows={selectedRows} onContextMenu={onContextMenu} selectAllRows={selectAllRows} selectRow={selectRow} />
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