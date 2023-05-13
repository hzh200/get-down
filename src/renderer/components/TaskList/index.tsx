import * as React from 'react'
import { Task, TaskSet, TaskType } from '../../../share/models'
import { TaskItem, TaskStatus } from '../../../share/models'
import { convertDateTimeToDate } from '../../../share/utils'
import { getTaskIconPath, getTaskSetIconPath } from './icon'
import { convertBytesToHumanReadable, calculateTransferSpeed } from './size'
import './task_list.css'

function TaskList({ taskItems, selectedRows, selectRow, onContextMenu, selectAllRows }: 
    { taskItems: Array<TaskItem>, selectedRows: Array<[number, TaskType]>, selectRow: Function, onContextMenu: Function,
        selectAllRows: React.KeyboardEventHandler<HTMLTableSectionElement> }) {
    return (
        <div className="task-list">
            <TaskListHead />
            <TaskListBody taskItems={taskItems} selectedRows={selectedRows} onContextMenu={onContextMenu} 
                selectAllRows={selectAllRows} selectRow={selectRow} />
        </div>
    )
}

function TaskListHead() {
    return (
        <div className="task-list-head">
            <table width="100%">
                <TaskListTableThead namedHead={true} />
            </table>
        </div>
    )
}

function TaskListBody({ taskItems, selectedRows, selectRow, onContextMenu, selectAllRows }: 
    { taskItems: Array<TaskItem>, selectedRows: Array<[number, TaskType]>, selectRow: Function, onContextMenu: Function,
        selectAllRows: React.KeyboardEventHandler<HTMLTableSectionElement> }) {
    return (
        <div className="task-list-body scroll">
            <table width="100%">
                <TaskListTableThead namedHead={false} />
                <TaskListTableBody taskItems={taskItems} selectedRows={selectedRows} onContextMenu={onContextMenu} 
                    selectAllRows={selectAllRows} selectRow={selectRow} />
            </table>
        </div>
    )
}

function TaskListTableThead({ namedHead }: { namedHead: boolean }) {
    return (
        <thead>
            <tr>
                <th className='type-thead-th'>{namedHead ? '' : ''}</th>
                <th className='name-thead-th'>{namedHead ? 'Name' : ''}</th>
                <th className='progress-thead-th'>{namedHead ? 'Progress' : ''}</th>
                <th className='size-thead-th'>{namedHead ? 'Size' : ''}</th>
                <th className='time-thead-th'>{namedHead ? 'Time' : ''}</th>
            </tr>
        </thead>
    )
}

function TaskListTableBody({ taskItems, selectedRows, selectRow, onContextMenu, selectAllRows }: 
    { taskItems: Array<TaskItem>, selectedRows: Array<[number, TaskType]>, selectRow: Function, onContextMenu: Function,
        selectAllRows: React.KeyboardEventHandler<HTMLTableSectionElement> }) {
    const [open, setOpen] = React.useState<Array<boolean>>(Array(taskItems.length).fill(false))
    const setIsOpen: Function = (taskNo: number) => {
        for (let i = 0; i < taskItems.length; i++) {
            if (taskItems[i].taskNo === taskNo && taskItems[i].taskType === TaskType.TaskSet) {
                setOpen(open => {
                    const newOpen: Array<boolean> = Array.from(open)
                    newOpen[i] = !newOpen[i]
                    return newOpen
                })
            }
        }
    }
    return (
        <tbody tabIndex={-1} onKeyDown={selectAllRows}>
            {/* tabIndex is a necessery property to use 'onKeyDown' */}
            {taskItems.map((taskItem: TaskItem, index: number) => {
                if (taskItem.taskType === TaskType.Task && (taskItem as Task).parent) {
                    for (let i = 0; i < index; i++) {
                        if (taskItems[i].taskNo === (taskItem as Task).parent && taskItems[i].taskType === TaskType.TaskSet 
                            && !open[i]) {
                            return
                        }
                    }
                }
                return <TaskListTableBodyRow taskItem={taskItem} selected={(() => {
                    // selectedRows.includes([taskItem.taskNo, taskItem.taskType])
                    for (const [taskNo, taskType] of selectedRows) {
                        if (taskNo === taskItem.taskNo && taskType === taskItem.taskType) {
                            return true
                        }
                    }
                    return false
                })()} selectRow={selectRow} key={index} onContextMenu={onContextMenu} setIsOpen={setIsOpen} isOpen={open[index]} />
            })}
        </tbody>
    )
}

function TaskListTableBodyRow({ taskItem, selected, selectRow, onContextMenu, setIsOpen, isOpen }: 
    { taskItem: TaskItem, selected: boolean, selectRow: Function, onContextMenu: Function, setIsOpen: Function, isOpen: boolean }) {
    const [lastProgress, setLastProgress] = React.useState<number>(taskItem.progress)
    const [lastTime, setLastTime] = React.useState<number>(new Date().getTime())
    const [speed, setSpeed] = React.useState<string>('')
    
    React.useEffect(() => {
        const currentTime = new Date().getTime()
        if (currentTime - lastTime < 1.5 * 1000) {
            return
        }
        setSpeed(calculateTransferSpeed(taskItem.progress - lastProgress, currentTime - lastTime))
        setLastProgress(taskItem.progress)
        setLastTime(currentTime)
    }, [taskItem])
    
    return (
        <tr className={selected ? 'tasklist-table-body-row selected-row' : 'tasklist-table-body-row'} 
            onContextMenu={(event: React.MouseEvent<HTMLTableRowElement>) => onContextMenu(event, taskItem.taskNo, taskItem.taskType)} >
            {/* <td className='taskno-tbody-td'>{task.taskNo}</td> */}
            <td onClick={() => {taskItem.taskType === TaskType.TaskSet ? setIsOpen(taskItem.taskNo): null}}><img height='15' width='15' src={
                taskItem.taskType === TaskType.Task ? getTaskIconPath((taskItem as Task).subType) : getTaskSetIconPath(isOpen)
            } /></td>
            <td onClick={(event: React.MouseEvent<HTMLTableCellElement>) => selectRow(event, taskItem.taskNo, taskItem.taskType)}>{taskItem.name}</td>
            <td>{taskItem.status === TaskStatus.Downloading ? speed : taskItem.status}</td>
            <td>{(() => {
                if (!taskItem.size) {
                    return ''
                }
                if (taskItem.status === TaskStatus.Done) {
                    return convertBytesToHumanReadable(taskItem.size)
                }
                // if (taskItem.status == TaskStatus.Waiting)
                return convertBytesToHumanReadable(lastProgress) + '/' + convertBytesToHumanReadable(taskItem.size)
            })()}</td>
            <td>{convertDateTimeToDate(taskItem.createdAt)}</td>
        </tr>
    )
}

export default TaskList