import * as mysql from 'mysql2'
import { getUser, updateUser } from './users'
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
    },
    DEPOSIT: {
        TEXT: {
            US: '📥 To deposit funds to your balance, send sum you wish to this BTC address:\n' +
                '{btcAddress}',
            RU: '📥 Чтобы внести средства на свой баланс, отправьте сумму, которую хотите получить на этот BTC адресс:\n' +
                '{btcAddress}'
        },
        KEYBOARD: {
            US: [ [ { text: '👈 Back', callback_data: 'back' } ] ],
            RU: [ [ { text: '👈 Назад', callback_data: 'back' } ] ]
        }
    },
    WITHDRAW: {
        TEXT: {
            US: 'Withdraw text',
            RU: 'Вывод Текст'
        },
        KEYBOARD: {
            US: [],
            RU: []
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

export default async (ctx: TelegrafContext, bd: mysql.Connection) => {
    let user: IUser = await getUser(bd, ctx.from.id)
    let [command, ...args] = ctx.update.callback_query.data.split(':')
    console.log(command, args)
    
    if (!user) {
        ctx.answerCbQuery('❌ Something went wrong')
    } else if (command == 'lang') {
        user.lang = args[0]
        await updateUser(bd, ctx.from.id, 'lang', user.lang)
        ctx.answerCbQuery('')
        let newText = MENUS.MAIN.TEXT[user.lang].replace('{balance}', balanceToString(user.balance)).replace('{wins}', user.wins)
        ctx.editMessageText(newText, {
            reply_markup: {
                inline_keyboard: MENUS.MAIN.KEYBOARD[user.lang]
            }
        })
    } else if (command == 'back') {
        ctx.answerCbQuery('')
        let newText = MENUS.MAIN.TEXT[user.lang].replace('{balance}', balanceToString(user.balance)).replace('{wins}', user.wins)
        ctx.editMessageText(newText, {
            reply_markup: {
                inline_keyboard: MENUS.MAIN.KEYBOARD[user.lang]
            }
        })
    } else if (command == 'deposit') {
        ctx.answerCbQuery('')
        console.log(user.lang)
        let newText = MENUS.DEPOSIT.TEXT[user.lang].replace('{btcAddress}', user.btcAddress)
        ctx.editMessageText(newText, {
            reply_markup: {
                inline_keyboard: MENUS.DEPOSIT.KEYBOARD[user.lang]
            }
        })
    } else if (command == 'withdraw') {

    } else if (command == 'rules') {

    } else if (command == 'settings') {

    }
}
