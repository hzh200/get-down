import * as React from 'react'
import './task_list.css'

import { TaskItem, TaskStatus } from '../../../../common/models'

function TaskList({ tasks }: { tasks: Array<TaskItem> }) {
    return (
        <div className="task-list">
            <TaskListHead />
            <TaskListBody tasks={tasks} />
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

function TaskListBody({ tasks }: { tasks: Array<TaskItem> }) {
    return (
        <div className="task-list-body">
            <table width="100%">
                <TaskListTableThead namedHead={false} />
                <TaskListTableBody tasks={tasks} />
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

function TaskListTableBody({ tasks }: { tasks: Array<TaskItem> }) {
    return (
        <tbody>
            {tasks.map((task, index) => <TaskListTableBodyRow task={task} key={index} />)}
        </tbody>
    )
}

function TaskListTableBodyRow({ task }: { task: TaskItem }) {
    return (
        <tr className='tasklist-table-body-row'>
            <td>{task.type}</td>
            <td>{task.name}</td>
            <td>{task.status === TaskStatus.downloading ? task.progress : task.status}</td>
            <td>{task.size === -1 ? '' : task.size}</td>
            <td>{task.createAt}</td>
        </tr>
    )
}

export default TaskList