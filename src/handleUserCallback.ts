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
        },
        KEYBOARD: {
            US: [ [ { text: '❌ Cancel deposit' } ] ],
            RU: [ [ { text: '❌ Отменить депозит' } ] ]
        }
    },
    WITHDRAW: {
        TEXT: {
            US: '📤 Enter address to withdraw BTC:',
            RU: '📤 Введите адрес для вывода BTC:'
        },
        KEYBOARD: {
            US: [ [ { text: '❌ Cancel withdraw' } ] ],
            RU: [ [ { text: '❌ Отменить вывод' } ] ]
        }
    },
    ALREADY_HAVE_WITHDRAW_REQUEST: {
        TEXT: {
            US: 'You already have withdraw request ({witdrawRequestSum})',
            RU: 'У вас уже есть заявка на вывод средств ({withdrawRequestSum})'
        }
    },
    ZERO_BALANCE: {
        TEXT: {
            US: '❌ You have no funds on your account',
            RU: '❌ У вас нет средств на балансе'
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
    },
    REFERRALS: {
        TEXT: {
            US: '👥 Referrals\n' +
                '\n' +
                'ℹ️ Your refferer: {referrerName}\n' +
                '🤝 Invited: {referralsCount}\n' +
                '\n' +
                '🔗 Your invitation link: t.me/{botUsername}?start={userID}',
            RU: '👥 Рефералы\n' +
                '\n' +
                'ℹ️ Вас пригласил: {referrerName}\n' +
                '🤝 Приглашено: {referralsCount}\n' +
                '\n' +
                '🔗 Ваша ссылка для приглашения: t.me/{botUsername}?start={userID}'
        },
        KEYBOARD: {
            US: [ [ { text: '👈 Back', callback_data: 'back' } ] ],
            RU: [ [ { text: '👈 Назад', callback_data: 'back' } ] ]
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
        let newText = TEMPLATES.MAIN.TEXT[user.lang].replace('{balance}', balanceToString(user.balance)).replace('{wins}', user.wins.toString())
        await ctx.editMessageText(newText, {
            reply_markup: {
                inline_keyboard: TEMPLATES.MAIN.KEYBOARD[user.lang]
            }
        })
        let replyText = TEMPLATES.SUBMIT_DEPOSIT.TEXT[user.lang]
        ctx.reply(replyText, {
            reply_markup: {
                keyboard: TEMPLATES.SUBMIT_DEPOSIT.KEYBOARD[user.lang],
                resize_keyboard: true
            }
        })
    } else if (command == 'withdraw') {
        if (user.withdrawRequest) {
            ctx.answerCbQuery(TEMPLATES.ALREADY_HAVE_WITHDRAW_REQUEST.TEXT[user.lang].replace('{withdrawRequestSum}', balanceToString(user.withdrawRequest)), true)
        } else if (user.balance == 0) {
            ctx.answerCbQuery(TEMPLATES.ZERO_BALANCE.TEXT[user.lang])
        } else {
            ctx.answerCbQuery('')
            await updateUser(bd, ctx.from.id, 'awaitingMessage', 'withdrawAddress')
            let replyText = TEMPLATES.WITHDRAW.TEXT[user.lang]
            ctx.reply(replyText, {
                reply_markup: {
                    keyboard: TEMPLATES.WITHDRAW.KEYBOARD[user.lang],
                    resize_keyboard: true
                }
            })
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
    } else if (command == 'refferals') {
        ctx.answerCbQuery('')
        let referrer = await getUser(bd, user.referrer)
        let newText =
            TEMPLATES.REFERRALS.TEXT[user.lang]
            .replace('{referrerName}', referrer ? referrer.name : '❌')
            .replace('{referralsCount}', user.referrals.toString())
            .replace('{botUsername}', process.env.BOT_USERNAME)
            .replace('{userID}', user.id.toString())
        ctx.editMessageText(newText, {
            reply_markup: {
                inline_keyboard: TEMPLATES.REFERRALS.KEYBOARD[user.lang]
            }
        })
    }
}
