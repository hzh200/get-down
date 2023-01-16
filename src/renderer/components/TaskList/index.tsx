import * as React from 'react'
import { TaskType } from '../../../share/models'
import { TaskItem, TaskStatus } from '../../../share/models'
import { getLocaleDateString } from '../../../share/utils'
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
        <div className="task-list-body">
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
                <th className='type-thead-th'>{namedHead ? 'Type' : ''}</th>
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
    return (
        <tbody tabIndex={-1} onKeyDown={selectAllRows}>
            {/* tabIndex is a necessery property to use 'onKeyDown' */}
            {taskItems.map((taskItem: TaskItem, index: number) => {
                return <TaskListTableBodyRow taskItem={taskItem} selected={(() => {
                    // selectedRows.includes([taskItem.taskNo, taskItem.taskType])
                    for (const [taskNo, taskType] of selectedRows) {
                        if (taskNo === taskItem.taskNo && taskType === taskItem.taskType) {
                            return true
                        }
                    }
                    return false
                })()} selectRow={selectRow} key={index} onContextMenu={onContextMenu} />
            })}
        </tbody>
    )
}

function TaskListTableBodyRow({ taskItem, selected, selectRow, onContextMenu }: 
    { taskItem: TaskItem, selected: boolean, selectRow: Function, onContextMenu: Function }) {
    return (
        <tr className={selected ? 'tasklist-table-body-row selected-row' : 'tasklist-table-body-row'} 
            onContextMenu={(event: React.MouseEvent<HTMLTableRowElement>) => onContextMenu(event, taskItem.taskNo, taskItem.taskType)} 
            onClick={(event: React.MouseEvent<HTMLTableRowElement>) => selectRow(event, taskItem.taskNo, taskItem.taskType)}>
            {/* <td className='taskno-tbody-td'>{task.taskNo}</td> */}
            <td>{taskItem.type}</td>
            <td>{taskItem.name}</td>
            <td>{taskItem.status === TaskStatus.Downloading ? taskItem.progress : taskItem.status}</td>
            <td>{taskItem.size === -1 ? '' : taskItem.size}</td>
            <td>{getLocaleDateString(taskItem.createdAt)}</td>
        </tr>
    )
}

export default TaskList