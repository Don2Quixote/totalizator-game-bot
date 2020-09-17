import * as mysql from 'mysql2'
import { getUser, updateUser } from './users'
import { IUser } from './user'
import { TelegrafContext } from 'telegraf/typings/context'

export default async (ctx: TelegrafContext, bd: mysql.Connection) => {
    if (!ctx.message.text) return
    let [command, ...args] = ctx.message.text.split(' ')
    console.log(command, args)

    if (command == '/add') {
        let user: IUser = await getUser(bd, +args[0])
        if (!user) {
        } else {
            await updateUser(bd, +args[0], 'satoshi', user.balance + +args[1])
        }
    } else if (command == '/sub') {
        ctx.reply('ok sub')
    } else if (command == '/balance') {
        
    } else {
        ctx.reply('❌ Неизвестная команда - ' + command.replace('/', ''))
    }
}
