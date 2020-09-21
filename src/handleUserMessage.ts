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
                [ { text: '❇️ Free stake', callback_data: 'freeStake' },
                  { text: '💸 Stake', callback_data: 'stake' } ],
                [ { text: '📥 Deposit', callback_data: 'deposit' },
                  { text: '📤 Withdraw', callback_data: 'withdraw' } ],
                [ { text: '👥 Refferals', callback_data: 'refferals' } ],
                [ { text: '📢 Rules', callback_data: 'rules' },
                  { text: '⚙️ Settings', callback_data: 'settings' } ]
            ],
            RU: [
                [ { text: '❇️ Бесплатная ставка', callback_data: 'freeStake' },
                  { text: '💸 Ставка', callback_data: 'stake' } ],
                [ { text: '📥 Пополнить', callback_data: 'deposit' },
                  { text: '📤 Вывести', callback_data: 'withdraw' } ],
                [ { text: '👥 Рефералы', callback_data: 'refferals' } ],
                [ { text: '📢 Правила', callback_data: 'rules' },
                  { text: '⚙️ Настройки', callback_data: 'settings' } ]
            ]
        }
    },
    DEPOSIT_REQUEST_CANCELED: {
        TEXT: {
            US: 'ℹ️ Deposit canceled',
            RU: 'ℹ️ Депозит отмёнен',
        }
    },
    DEPOSIT_REQUEST_CREATED: {
        TEXT: {
            US: '✅ Deposit request created',
            RU: '✅ Заявка депозит создана'
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
    },
    WITHDRAW_REQUEST_CANCELED: {
        TEXT: {
            US: 'ℹ️ Withdraw request canceled',
            RU: 'ℹ️ Запрос на вывод средств отмёнен',
        }
    }
}

const balanceToString = (satoshi: number): string => {
    let btcPart =  (satoshi / 100000000).toFixed(0)
    let satoshiPart: any = satoshi % 100000000
    if      (satoshiPart < 10) satoshiPart = '0000000' + satoshiPart.toString()
    else if (satoshiPart < 100) satoshiPart = '000000' + satoshiPart.toString()
    else if (satoshiPart < 1000) satoshiPart = '00000' + satoshiPart.toString()
    else if (satoshiPart < 10000) satoshiPart = '0000' + satoshiPart.toString()
    else if (satoshiPart < 100000) satoshiPart = '000' + satoshiPart.toString()
    else if (satoshiPart < 1000000) satoshiPart = '00' + satoshiPart.toString()
    else if (satoshiPart < 10000000) satoshiPart = '0' + satoshiPart.toString()
    return btcPart + '.' + satoshiPart
}


export default async (ctx: TelegrafContext, bd: mysql.Connection) => {
    if (!ctx.message.text) return
    let [command, ...args] = ctx.message.text.split(' ')
    console.log(command, args)

    let user: IUser = await getUser(bd, ctx.from.id)
    if (!user) {
        let referrerID = parseInt(args[0])
        let referrer: IUser
        if (referrerID) {
            referrer = await getUser(bd, referrerID)
        }
        if (referrer) {
            await addUser(bd, ctx.from.id, ctx.from.username || ctx.from.first_name, referrerID)
        } else {
            await addUser(bd, ctx.from.id, ctx.from.username || ctx.from.first_name)
        }
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
        let messageText = ctx.message.text.toLowerCase()
        if (messageText.includes('отменить') || messageText.includes('cancel')) {
            await updateUser(bd, ctx.from.id, 'awaitingMessage', '')
            ctx.reply(TEMPLATES.WITHDRAW_REQUEST_CANCELED.TEXT[user.lang], {
                reply_markup: {
                    remove_keyboard: true
                }
            })
        } else {
            await updateUser(bd, ctx.from.id, ['actionData', 'awaitingMessage'], [ctx.message.text, 'withdrawSum'])
            ctx.reply(TEMPLATES.WITHDRAW_ENTER_SUM.TEXT[user.lang])
        }
    } else if (user.awaitingMessage == 'withdrawSum') {
        let messageText = ctx.message.text.toLowerCase()
        let sum = ctx.message.text
        if (messageText.includes('отменить') || messageText.includes('cancel')) {
            await updateUser(bd, ctx.from.id, ['actionData', 'awaitingMessage'], ['', ''])
            ctx.reply(TEMPLATES.WITHDRAW_REQUEST_CANCELED.TEXT[user.lang], {
                reply_markup: {
                    remove_keyboard: true
                }
            })
        } else if (user.balance < +(parseFloat(sum) * 100000000).toFixed(0)) {
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
        let messageText = ctx.message.text.toLowerCase()
        if (messageText.includes('отменить') || messageText.includes('cancel')) {
            await updateUser(bd, ctx.from.id, ['actionData', 'awaitingMessage'], ['', ''])
            ctx.reply(TEMPLATES.DEPOSIT_REQUEST_CANCELED.TEXT[user.lang], {
                reply_markup: {
                    remove_keyboard: true
                }
            })
        } else {
            let transactionID = ctx.message.text
            await updateUser(bd, ctx.from.id, 'awaitingMessage', '')
            let messageToAdmin =
                '📥 Депозит\n' +
                `👤 [${mf(user.name)}](tg://user?id=${user.id}) \\(${user.id}\\)\n` +
                `📌 ID Транзакции: ${transactionID}\n`
            await ctx.telegram.sendMessage(process.env.ADMIN_ID, messageToAdmin, {
                parse_mode: 'MarkdownV2',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '👁 sochain', url: 'https://sochain.com/tx/BTC/' + encodeURIComponent(transactionID) },
                            { text: '♻️ Готово', callback_data: 'removeRequest' }
                        ]
                    ]
                }
            })
            ctx.reply(TEMPLATES.DEPOSIT_REQUEST_CREATED.TEXT[user.lang])
        }
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
