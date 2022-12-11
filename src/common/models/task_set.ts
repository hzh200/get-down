import { TaskItem } from './task_item'

export class TaskSet extends TaskItem {
    declare taskNo: number
    declare name: string
    declare size: number
    declare type: string
    declare url: string
    declare status: string
    declare progress: number
    declare parserNo: number
    declare createAt: string // timestamp added automatically by Sequelize
    declare updateAt: string // timestamp added automatically by Sequelize

    children: Array<number> // Task children
   
}