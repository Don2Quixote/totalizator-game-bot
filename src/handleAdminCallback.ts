import * as sqlite3 from 'sqlite3'
import * as mysql from 'mysql2'
import { getUser, updateUser } from './database'
import { IUser } from './user'
import { TelegrafContext } from 'telegraf/typings/context'

export default async (ctx: TelegrafContext, bd: mysql.Connection) => {
// export default async (ctx: TelegrafContext, bd: sqlite3.Database) => {
    let [command, ...args] = ctx.update.callback_query.data.split(':')
    console.log(command, args)
    
    if (command == 'removeRequest') {
        ctx.deleteMessage()
    }
}
