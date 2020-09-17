import * as mysql from 'mysql2'
import { getUser, updateUser } from './users'
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
    DEPOSIT: {
        TEXT: {
            US: '📥 To deposit funds to your balance, send sum you wish to this BTC address:\n' +
                process.env.BTC_ADDRESS + '\n' +
                '\n' +
                'Then press "submit" button and send transaction ID',
            RU: '📥 Чтобы внести средства на свой баланс, отправьте сумму, которую хотите получить, на этот BTC адрес:\n' +
                process.env.BTC_ADDRESS + '\n' +
                '\n' +
                'После этого нажмите кнопку подтвердить и отправьте ID транзакции'
        },
        KEYBOARD: {
            US: [
                [ { text: '👈 Back', callback_data: 'back' },
                  { text: '✅ Submit', callback_data: 'submitDeposit' } ]
            ],
            RU: [
                [ { text: '👈 Назад', callback_data: 'back' },
                  { text: '✅ Подтвердить', callback_data: 'submitDeposit' } ]
            ]
        }
    },
    SUBMIT_DEPOSIT: {
        TEXT: {
            US: '📥 Enter the transaction ID:',
            RU: '📥 Введите ID транзакции:'
        }
    },
    WITHDRAW: {
        TEXT: {
            US: '📤 Enter address to withdraw BTC:',
            RU: '📤 Введите адрес для вывода BTC:'
        },
        KEYBOARD: {
            US: [ [ { text: '👈 Back', callback_data: 'back' } ] ],
            RU: [ [ { text: '👈 Назад', callback_data: 'back' } ] ]
        }
    },
    ALREADY_HAVE_WITHDRAW_REQUEST: {
        TEXT: {
            US: 'You already have withdraw request ({witdrawRequestSum})',
            RU: 'У вас уже есть заявка на вывод средств ({withdrawRequestSum})'
        }
    },
    RULES: {
        TEXT: {
            US: '📢 Rules',
            RU: '📢 Правила'
        },
        KEYBOARD: {
            US: [ [ { text: '👈 Back', callback_data: 'back' } ] ],
            RU: [ [ { text: '👈 Назад', callback_data: 'back' } ] ]
        }
    },
    SETTINGS: {
        TEXT: {
            US: '⚙️ Select language',
            RU: '⚙️ Выберите язык'
        },
        KEYBOARD: {
            US: [
                [
                    { text: '🇺🇸', callback_data: 'lang:US' },
                    { text: '🇷🇺', callback_data: 'lang:RU' }
                ],
                [ { text: '👈 Back', callback_data: 'back' } ]
            ],
            RU: [
                [
                    { text: '🇺🇸', callback_data: 'lang:US' },
                    { text: '🇷🇺', callback_data: 'lang:RU' }
                ],
                [ { text: '👈 Назад', callback_data: 'back' } ]
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

export default async (ctx: TelegrafContext, bd: mysql.Connection) => {
    let user: IUser = await getUser(bd, ctx.from.id)
    let [command, ...args] = ctx.update.callback_query.data.split(':')
    console.log(command, args)
    
    if (!user) {
        ctx.answerCbQuery('❌ Something went wrong')
    } else if (command == 'lang') {
        user.lang = args[0] as 'US' | 'RU'
        await updateUser(bd, ctx.from.id, 'lang', user.lang)
        ctx.answerCbQuery('')
        let newText = TEMPLATES.MAIN.TEXT[user.lang].replace('{balance}', balanceToString(user.balance)).replace('{wins}', user.wins.toString())
        ctx.editMessageText(newText, {
            reply_markup: {
                inline_keyboard: TEMPLATES.MAIN.KEYBOARD[user.lang]
            }
        })
    } else if (command == 'back') {
        ctx.answerCbQuery('')
        let newText = TEMPLATES.MAIN.TEXT[user.lang].replace('{balance}', balanceToString(user.balance)).replace('{wins}', user.wins.toString())
        ctx.editMessageText(newText, {
            reply_markup: {
                inline_keyboard: TEMPLATES.MAIN.KEYBOARD[user.lang]
            }
        })
    } else if (command == 'deposit') {
        ctx.answerCbQuery('')
        let newText = TEMPLATES.DEPOSIT.TEXT[user.lang]
        ctx.editMessageText(newText, {
            reply_markup: {
                inline_keyboard: TEMPLATES.DEPOSIT.KEYBOARD[user.lang]
            }
        })
    } else if (command == 'submitDeposit') {
        await updateUser(bd, ctx.from.id, 'awaitingMessage', 'transactionID')
        ctx.answerCbQuery('')
        await ctx.editMessageText(TEMPLATES.MAIN.TEXT[user.lang], {
            reply_markup: {
                inline_keyboard: TEMPLATES.MAIN.KEYBOARD[user.lang]
            }
        })
        let replyText = TEMPLATES.SUBMIT_DEPOSIT.TEXT[user.lang]
        ctx.reply(replyText)
    } else if (command == 'withdraw') {
        if (user.withdrawRequest) {
            ctx.answerCbQuery(TEMPLATES.ALREADY_HAVE_WITHDRAW_REQUEST.TEXT[user.lang].replace('{withdrawRequestSum}', user.withdrawRequest), true)
        } else {
            ctx.answerCbQuery('')
            await updateUser(bd, ctx.from.id, 'awaitingMessage', 'withdrawAdddress')
            let replyText = TEMPLATES.WITHDRAW.TEXT[user.lang]
            ctx.reply(replyText)
        }
    } else if (command == 'rules') {
        ctx.answerCbQuery('')
        ctx.editMessageText(TEMPLATES.RULES.TEXT[user.lang], {
            reply_markup: {
                inline_keyboard: TEMPLATES.RULES.KEYBOARD[user.lang]
            }
        })
    } else if (command == 'settings') {
        ctx.answerCbQuery('')
        ctx.editMessageText(TEMPLATES.SETTINGS.TEXT[user.lang], {
            reply_markup: {
                inline_keyboard: TEMPLATES.SETTINGS.KEYBOARD[user.lang]
            }
        })
    }
}
