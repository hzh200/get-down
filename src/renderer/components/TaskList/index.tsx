import * as React from 'react'
import { TaskItem, TaskStatus } from '../../../share/models'
import { getLocaleDateString } from '../../../share/utils'
import './task_list.css'

function TaskList({ tasks, selectedRows, selectRow, onContextMenu, selectAllRows }: 
    { tasks: Array<TaskItem>, selectedRows: Array<Number>, selectRow: Function, onContextMenu: Function,
        selectAllRows: React.KeyboardEventHandler<HTMLTableSectionElement> }) {
    return (
        <div className="task-list">
            <TaskListHead />
            <TaskListBody tasks={tasks} selectedRows={selectedRows} onContextMenu={onContextMenu} selectAllRows={selectAllRows} selectRow={selectRow} />
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

function TaskListBody({ tasks, selectedRows, selectRow, onContextMenu, selectAllRows }: 
    { tasks: Array<TaskItem>, selectedRows: Array<Number>, selectRow: Function, onContextMenu: Function,
        selectAllRows: React.KeyboardEventHandler<HTMLTableSectionElement> }) {
    return (
        <div className="task-list-body">
            <table width="100%">
                <TaskListTableThead namedHead={false} />
                <TaskListTableBody tasks={tasks} selectedRows={selectedRows} onContextMenu={onContextMenu} selectAllRows={selectAllRows} selectRow={selectRow} />
            </table>
        </div>
    )
}

function TaskListTableThead({ namedHead }: { namedHead: boolean }) {
    if (namedHead) {
        return (
            <thead>
                <tr>
                    <th className='type-thead-th'>Type</th>
                    <th className='name-thead-th'>Name</th>
                    <th className='progress-thead-th'>Progress</th>
                    <th className='size-thead-th'>Size</th>
                    <th className='time-thead-th'>Time</th>
                </tr>
            </thead>
        )
    } else {
        return (
            <thead>
                <tr>
                    <th className='type-thead-th'></th>
                    <th className='name-thead-th'></th>
                    <th className='progress-thead-th'></th>
                    <th className='size-thead-th'></th>
                    <th className='time-thead-th'></th>
                </tr>
            </thead>
        )
    }
}

function TaskListTableBody({ tasks, selectedRows, selectRow, onContextMenu, selectAllRows }: 
    { tasks: Array<TaskItem>, selectedRows: Array<Number>, selectRow: Function, onContextMenu: Function,
        selectAllRows: React.KeyboardEventHandler<HTMLTableSectionElement> }) {
    return (
        <tbody tabIndex={-1} onKeyDown={selectAllRows}>
            {/* tabIndex is a necessery property to use 'onKeyDown' */}
            {tasks.map((task: TaskItem, index: number) => {
                return <TaskListTableBodyRow task={task} selected={selectedRows.includes(task.taskNo)} selectRow={selectRow} key={index} onContextMenu={onContextMenu} />
            })}
        </tbody>
    )
}

function TaskListTableBodyRow({ task, selected, selectRow, onContextMenu }: 
    { task: TaskItem, selected: boolean, selectRow: Function, onContextMenu: Function }) {
    const taskNo: number = task.taskNo
    return (
        <tr className={selected ? 'tasklist-table-body-row selected-row' : 'tasklist-table-body-row'} onContextMenu={(event: React.MouseEvent<HTMLTableRowElement>) => onContextMenu(event, taskNo)} onClick={(event: React.MouseEvent<HTMLTableRowElement>) => selectRow(event, taskNo)}>
            {/* <td className='taskno-tbody-td'>{task.taskNo}</td> */}
            <td>{task.type}</td>
            <td>{task.name}</td>
            <td>{task.status === TaskStatus.downloading ? task.progress : task.status}</td>
            <td>{task.size === -1 ? '' : task.size}</td>
            <td>{getLocaleDateString(task.createdAt)}</td>
        </tr>
    )
}

export default TaskList