import { IBlockIOApi } from './blockIOApi'
import * as mysql from 'mysql2'
import { addUser, getUser, updateUser } from './users'
import { IUser } from './user'
import { TelegrafContext } from 'telegraf/typings/context'

const MENUS = {
    MAIN: {
        TEXT: {
            US: '👋 Welcome to the Totalizator game!\n' +
                '\n' +
                '💰 Your balance: {balance} BTC\n' +
                '🏆 Your wins: {wins}',
            RU: '👋 Добро пожаловать в игру "Тотализатор"!\n' +
                '\n' +
                '💰 Ваш баналс: {balance} BTC\n' +
                '🏆 Ваши победы: {wins}'
        },
        KEYBOARD: {
            US: [
                [ { text: '📥 Deposit', callback_data: 'deposit' },
                  { text: '📤 Withdraw', callback_data: 'withdraw' } ],
                [ { text: '📢 Rules', callback_data: 'rules' },
                  { text: '⚙️ Settings', callback_data: 'settings' } ]
            ],
            RU: [
                [ { text: '📥 Пополнить', callback_data: 'deposit' },
                  { text: '📤 Вывести', callback_data: 'withdraw' } ],
                [ { text: '📢 Правила', callback_data: 'rules' },
                  { text: '⚙️ Настройки', callback_data: 'settings' } ]
            ]
        }
    }
}

const balanceToString = (balance: IUser['balance']): string => {
    let str = balance.btc.toString() + '.'
    if      (balance.satoshi < 10) return str + '0000000' + balance.satoshi.toString()
    else if (balance.satoshi < 100) return str + '000000' + balance.satoshi.toString()
    else if (balance.satoshi < 1000) return str + '00000' + balance.satoshi.toString()
    else if (balance.satoshi < 10000) return str + '0000' + balance.satoshi.toString()
    else if (balance.satoshi < 100000) return str + '000' + balance.satoshi.toString()
    else if (balance.satoshi < 1000000) return str + '00' + balance.satoshi.toString()
    else if (balance.satoshi < 10000000) return str + '0' + balance.satoshi.toString()
    return str + balance.satoshi.toString()
}

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
    } else if (ctx.message.text == '/start') {
        let replyText = MENUS.MAIN.TEXT[user.lang].replace('{balance}', balanceToString(user.balance)).replace('{wins}', user.wins)
        ctx.reply(replyText, {
            reply_markup: {
                inline_keyboard: MENUS.MAIN.KEYBOARD[user.lang]
            }
        })
    }
}
