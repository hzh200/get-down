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
import { Task, TaskSet, TaskItem, TaskStatus, TaskType } from '../../../share/models'
import { CommunicateAPIName } from '../../../share/communication'
import DownloadInfo from './download_info'
import './global.css'

function MainPage() {
    const [taskItems, setTaskItems] = React.useState<Array<TaskItem>>([])
    const [downloadInfos, setDownloadInfos] = React.useState<Map<string, DownloadInfo>>(new Map())
    const [selectedRows, setSelectedRows] = React.useState<Array<[number, TaskType]>>([])
    const [showParserWindow, setShowParserWindow] = React.useState<boolean>(false)
    const [showSettingWindow, setShowSettingWindow] = React.useState<boolean>(false)
    React.useEffect(() => {
        // Update taskItems for showing up.
        ipcRenderer.on(CommunicateAPIName.NewTaskItem, (_event: IpcRendererEvent, newTaskItem: TaskItem) => {
            setTaskItems((taskItems: Array<TaskItem>) => taskItems.concat(newTaskItem))
        })
        ipcRenderer.on(CommunicateAPIName.UpdateTaskItem, (_event: IpcRendererEvent, updateTaskItem: TaskItem) => {
            setTaskItems((taskItems: Array<TaskItem>) => {
                let newTaskItems: Array<TaskItem> = [ ...taskItems ]
                for (let i = 0; i < newTaskItems.length; i++) {
                    if (newTaskItems[i].taskNo === updateTaskItem.taskNo && newTaskItems[i].taskType === updateTaskItem.taskType) {
                        newTaskItems[i] = updateTaskItem
                        break
                    }
                }
                return newTaskItems
            })
            if (!downloadInfos.has(`${updateTaskItem.taskType}${updateTaskItem.taskNo}`) 
                    && updateTaskItem.status === TaskStatus.Downloading) {
                setDownloadInfos(downloadInfos => {
                    const newDownloadInfos: Map<string, DownloadInfo> = new Map(downloadInfos.entries())
                    const downloadInfo: DownloadInfo = new DownloadInfo()
                    downloadInfo.taskNo = updateTaskItem.taskNo
                    downloadInfo.taskType = updateTaskItem.taskType
                    downloadInfo.speed = ''
                    newDownloadInfos.set(`${updateTaskItem.taskType}${updateTaskItem.taskNo}`, downloadInfo) 
                    return newDownloadInfos
                })
            } else if (!downloadInfos.has(`${updateTaskItem.taskType}${updateTaskItem.taskNo}`)) {
                setDownloadInfos(downloadInfos => {
                    const newDownloadInfos: Map<string, DownloadInfo> = new Map(downloadInfos.entries())
                    newDownloadInfos.delete(`${updateTaskItem.taskType}${updateTaskItem.taskNo}`)
                    return newDownloadInfos
                })
            }
        })
        ipcRenderer.on(CommunicateAPIName.DeleteTaskItem, (_event: IpcRendererEvent, deletedTaskItem: TaskItem) => {
            setTaskItems((taskItems: Array<TaskItem>) => {
                let newTaskItems: Array<TaskItem> = [ ...taskItems ]
                let deletedTaskItemIndex: number = -1
                for (let i = 0; i < newTaskItems.length; i++) {
                    if (newTaskItems[i].taskNo === deletedTaskItem.taskNo && newTaskItems[i].taskType === deletedTaskItem.taskType) {
                        deletedTaskItemIndex = i
                        break
                    }
                }
                newTaskItems.splice(deletedTaskItemIndex, 1)
                return newTaskItems
            })
            if (downloadInfos.has(`${deletedTaskItem.taskType}${deletedTaskItem.taskNo}`)) {
                setDownloadInfos(downloadInfos => {
                    const newDownloadInfos: Map<string, DownloadInfo> = new Map(downloadInfos.entries())
                    newDownloadInfos.delete(`${deletedTaskItem.taskType}${deletedTaskItem.taskNo}`)
                    return newDownloadInfos
                })
            }
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
    const onContextMenu: Function = (_event: React.MouseEvent<HTMLTableSectionElement>, taskNo: number, taskType: TaskType): void => {
        const taskItem: TaskItem = taskItems.filter((taskItem: TaskItem, _index: number, _array: Array<TaskItem>) => {
            return taskItem.taskNo === taskNo
        })[0]
        // Cannot use 'task instanceof Task', class type information is already lost during inter-process communication
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
            click: () => clipboard.writeText(taskItem.url, 'clipboard')
        }))
        if (taskItem.taskType === TaskType.Task) {
            menu.append(new MenuItem({ 
                label: 'copy download url', 
                click: () => clipboard.writeText((taskItem as Task).downloadUrl, 'clipboard')
            }))
        }
        menu.append(new MenuItem({ 
            label: 'copy filename', 
            click: () => clipboard.writeText(taskItem.name, 'clipboard')
        }))
        menu.append(new MenuItem({ type: 'separator' }))
        if (taskItem.taskType === TaskType.Task) {
            menu.append(new MenuItem({ 
                label: 'open file', 
                click: () => shell.openPath(path.join((taskItem as Task).location, taskItem.name))
            }))
            menu.append(new MenuItem({ 
                label: 'open file folder', 
                // click: () => shell.openPath(task.getDownloadDir())
                click: () => shell.showItemInFolder(path.join((taskItem as Task).location, taskItem.name))
            }))
            menu.append(new MenuItem({ type: 'separator' }))
        } 
        menu.append(new MenuItem({ 
            label: 'nothing', 
            type: 'checkbox',
            checked: true,
            click: () => clipboard.writeText(taskItem.name, 'clipboard')
        }))
        menu.popup()
    }
    // React.MouseEventHandler<HTMLTableRowElement>
    const selectRow: Function = (event: React.MouseEvent<HTMLTableRowElement>, taskNo: number, taskType: TaskType): void => {
        event.preventDefault()
        // const target: HTMLTableRowElement = event.target as HTMLTableRowElement
        // const taskNo: number = parseInt(target.parentElement?.children[0]?.innerHTML as string)
        let newSelectedRows: Array<[number, TaskType]> = [...selectedRows]
        if ((window as any).event.ctrlKey) {
            let isContained: boolean = false
            for (const [selectedTaskNo, selectedTaskType] of newSelectedRows) {
                if (selectedTaskNo === taskNo && selectedTaskType === taskType) {
                    isContained = true
                }
            }

            if (isContained) {
                newSelectedRows = newSelectedRows.filter(([selectedTaskNo, selectedTaskType]: [number, TaskType], _index: number, _array: Array<[number, TaskType]>) => {
                    return selectedTaskNo !== taskNo || selectedTaskType !== taskType
                })
            } else {
                newSelectedRows.push([taskNo, taskType])
            }
        } else {
            newSelectedRows = [[taskNo, taskType]]
        }
        setSelectedRows((_selectedRows: Array<[number, TaskType]>) => {
            return newSelectedRows
        })
    }
    const selectAllRows: React.KeyboardEventHandler<HTMLTableSectionElement> = (event: React.KeyboardEvent<HTMLTableSectionElement>) => {
        event.preventDefault()
        if ((event.key === 'A' || event.key === 'a') && (window as any).event.ctrlKey) {
            setSelectedRows((_selectedRows: Array<[number, TaskType]>) => {
                const newSelectedRows: Array<[number, TaskType]> = taskItems.map(
                    (taskItem: TaskItem, _index: number, _array) => {
                        return [taskItem.taskNo, taskItem.taskType]
                    }
                )
                return newSelectedRows
            })
        }
    }

    return (
        <div className="main-container">
            <OperationBar play={play} pause={pause} trash={trash} openParser={openParser} openSetting={openSetting} />
            <TaskList taskItems={taskItems} selectedRows={selectedRows} onContextMenu={onContextMenu} selectAllRows={selectAllRows} selectRow={selectRow} />
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