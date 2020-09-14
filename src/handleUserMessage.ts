import { IBlockIOApi } from './blockIOApi'
import BlockIOApi from './blockIOApi'
import * as mysql from 'mysql2'
import { addUser, getUser, updateUser } from './users'
import { IUser } from './user'
import { TelegrafContext } from 'telegraf/typings/context'

let blockio = new BlockIOApi(process.env.BLOCK_IO_TOKEN);

export default async (ctx: TelegrafContext, bd: mysql.Connection, blockio: IBlockIOApi) => {
    let user: IUser = await getUser(bd, ctx.from.id)
    if (!user) {
        let newUserAddress
        try {
            newUserAddress = await blockio.getNewAddress('user' + ctx.from.id)
        } catch (e) {
            newUserAddress = await blockio.getAddressByLabel('user' + ctx.from.id)
        }
        addUser(bd, ctx.from.id, ctx.from.username || ctx.from.first_name, newUserAddress.address)
        ctx.reply('👋 Select language', {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🇺🇸', callback_data: 'lang:US' },
                        { text: '🇷🇺', callback_data: 'lang:RU' }
                    ]
                ]
            }
        })
    } else if (true) {
        ctx.reply('You already registered')
    }
}
