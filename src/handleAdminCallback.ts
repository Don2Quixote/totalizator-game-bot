import * as mysql from 'mysql2'
import { getUser, updateUser } from './database'
import { IUser } from './user'
import { TelegrafContext } from 'telegraf/typings/context'

export default async (ctx: TelegrafContext, bd: mysql.Connection) => {
    let [command, ...args] = ctx.update.callback_query.data.split(':')
    console.log(command, args)
    
    if (command == 'removeRequest') {
        ctx.deleteMessage()
    }
}
