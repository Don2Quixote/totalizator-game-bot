import { IBlockIOApi } from './blockIOApi'
import mf from './md_friendly'
import * as mysql from 'mysql2'
import { addUser, getUser, updateUser } from './users'
import { IUser } from './user'
import { TelegrafContext } from 'telegraf/typings/context'

const TEMPLATES = {
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
    WITHDRAW_ENTER_SUM: {
        TEXT: {
            US: '📤 Now enter sum you want to withdraw (Example: 0.00004307):',
            RU: '📤 Теперь введите сумму, которую хотите вывести (Например: 0.00004307):'
        }
    },
    WITHDRAW_NOT_ENOUGH_FUNDS_ON_BALANCE: {
        TEXT: {
            US: '❌ You have no this sum on your balance',
            RU: '❌ У вас недостаточно средств на балансе'
        }
    },
    WITHDRAW_REQUEST_LESS_THAN_MIN_SUM: {
        TEXT: {
            US: '❌ Minimal sum to withdraw is: 0.0005 BTC',
            RU: '❌ Минимальная сумма для вывода: 0.0005 BTC'
        }
    },
    WITHDRAW_REQUEST_CREATED: {
        TEXT: {
            US: '✅ Withdraw request created',
            RU: '✅ Заявка на вывод средств создана'
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
    if (!ctx.message.text) return
    let [command, ...args] = ctx.message.text.split(' ')
    console.log(command, args)

    let user: IUser = await getUser(bd, ctx.from.id)
    if (!user) {
        await addUser(bd, ctx.from.id, ctx.from.username || ctx.from.first_name)
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
        return
    }
    
    if (user.awaitingMessage == 'withdrawAddress') {
        await updateUser(bd, ctx.from.id, ['actionData', 'awaitingMessage'], [ctx.message.text, 'withdrawSum'])
        ctx.reply(TEMPLATES.WITHDRAW_ENTER_SUM.TEXT[user.lang])
    } else if (user.awaitingMessage == 'withdrawSum') {
        let sum = ctx.message.text
        if (user.balance.btc * 100000000 + user.balance.satoshi < +(parseFloat(sum) * 100000000).toFixed(0)) {
            ctx.reply(TEMPLATES.WITHDRAW_NOT_ENOUGH_FUNDS_ON_BALANCE.TEXT[user.lang])
        } else if (+sum < 0.0005) {
            ctx.reply(TEMPLATES.WITHDRAW_REQUEST_LESS_THAN_MIN_SUM.TEXT[user.lang])
        } else {
            await updateUser(bd, ctx.from.id, ['actionData', 'awaitingMessage'], ['', ''])
            let messageToAdmin =
                '📤 Вывод\n' +
                `👤 [${mf(user.name)}](tg://user?id=${user.id}) (${user.id})\n` +
                `💰 Сумма вывода: ${mf(sum)}\n` +
                `💳 Баланс пользователя: ${mf(balanceToString(user.balance))}`
            ctx.telegram.sendMessage(process.env.ADMIN_ID, messageToAdmin, {
                parse_mode: 'MarkdownV2',
                reply_markup: {
                    inline_keyboard: [
                        [ { text: '♻️ Готово', callback_data: 'removeRequest' } ]
                    ]
                }
            })
            ctx.reply(TEMPLATES.WITHDRAW_REQUEST_CREATED.TEXT[user.lang])
        }
    } else if (user.awaitingMessage == 'transactionID') {
        let transactionID = ctx.message.text
        await updateUser(bd, ctx.from.id, 'awaitingMessage', '')
        let messageToAdmin =
            '📥 Депозит\n' +
            `👤 [${mf(user.name)}](tg://user?id=${user.id}) \\(${user.id}\\)\n` +
            `📌 ID Транзакции: ${transactionID}\n`
        ctx.telegram.sendMessage(process.env.ADMIN_ID, messageToAdmin, {
            parse_mode: 'MarkdownV2',
            reply_markup: {
                inline_keyboard: [
                    [ { text: '♻️ Готово', callback_data: 'removeRequest' } ]
                ]
            }
        })
    }
    if (command == '/start') {
        let replyText = TEMPLATES.MAIN.TEXT[user.lang].replace('{balance}', balanceToString(user.balance)).replace('{wins}', user.wins.toString())
        ctx.reply(replyText, {
            reply_markup: {
                inline_keyboard: TEMPLATES.MAIN.KEYBOARD[user.lang]
            }
        })
    } else if (command == '/withdraw') {
    }
}
