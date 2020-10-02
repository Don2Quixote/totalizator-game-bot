import * as sqlite3 from 'sqlite3'
import * as mysql from 'mysql2'
import { getUser, updateUser } from './database'
// import {
//     getUserLite as getUser,
//     updateUserLite as updateUser
// } from './database'
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
                [ { text: '👥 Referrals', callback_data: 'referrals' } ],
                [ { text: '📢 Rules', callback_data: 'rules' },
                  { text: '⚙️ Settings', callback_data: 'settings' } ]
            ],
            RU: [
                [ { text: '❇️ Бесплатная ставка', callback_data: 'freeStake' },
                  { text: '💸 Ставка', callback_data: 'stake' } ],
                [ { text: '📥 Пополнить', callback_data: 'deposit' },
                  { text: '📤 Вывести', callback_data: 'withdraw' } ],
                [ { text: '👥 Рефералы', callback_data: 'referrals' } ],
                [ { text: '📢 Правила', callback_data: 'rules' },
                  { text: '⚙️ Настройки', callback_data: 'settings' } ]
            ]
        }
    },
    FREE_STAKE: {
        TEXT: {
            US: '❇️ Free stake\n' +
                '\n' +
                'Everyday until 15:00 (Moscow Time) you can place a free stake',
            RU: '❇️ Бесплатная ставка\n' +
                '\n' +
                'Каждый день до 15:00 (МСК) вы можете сделать бесплатную ставку'
        },
        KEYBOARD: {
            US: [
                [ { text: '❇️ Place stake', callback_data: 'placeFreeStake' } ],
                [ { text: '👈 Back', callback_data: 'back' } ]
            ],
            RU: [
                [ { text: '❇️ Сделать ставку', callback_data: 'placeFreeStake' } ],
                [ { text: '👈 Назад', callback_data: 'back' } ]
            ]
        }
    },
    STAKE: {
        TEXT: {
            US: '💸 Stake\n' +
                '\n' + 
                'Price of each stake - 10.000 satoshi.\n' +
                'You can place not more than 50 stakes per day',
            RU: '💸 Ставка\n' +
                '\n' +
                'Стоимость каждой ставки - 10.000 сатоши.\n' +
                'Вы можете сделать не более 50 ставок за день.'
        },
        KEYBOARD: {
            US: [
                [ { text: '💸 Place stake', callback_data: 'placeStake' } ],
                [ { text: '👈 Back', callback_data: 'back' } ]
            ],
            RU: [
                [ { text: '💸 Сделать ставку', callback_data: 'placeStake' } ],
                [ { text: '👈 Назад', callback_data: 'back' } ]
            ]
        }
    },
    ALREADY_PLACED_FREE_STAKE: {
        TEXT: {
            US: '❌ You already placed a free stake today',
            RU: '❌ Вы уже сделали бесплатную ставку сегодня'
        }
    },
    TOO_MANY_STAKES: {
        TEXT: {
            US: '❌ You can\'t place more than 50 stakes per day',
            RU: '❌ Вы не можете разместить более 50 ставок в день'
        }
    },
    PLACE_FREE_STAKE: {
        TEXT: {
            US: '💲 Send me your prediction:',
            RU: '💲 Отправьте свой прогноз:'
        },
        KEYBOARD: {
            US: [
                [ { text: '❌ Cancel free stake' } ]
            ],
            RU: [
                [ { text: '❌ Отменить ставку' } ]
            ]
        }
    },
    PLACE_STAKE: {
        TEXT: {
            US: '💲 Send me your prediction:',
            RU: '💲 Отправьте свой прогноз:'
        },
        KEYBOARD: {
            US: [
                [ { text: '❌ Cancel stake' } ]
            ],
            RU: [
                [ { text: '❌ Отменить ставку' } ]
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
            US: '📤 Withdaw\n' +
                '\n' +
                'ℹ️ There are two ways to withdraw funds:\n' +
                ' - BTC Wallet - min 0.003 BTC\n' +
                ' - Yobit code - min 0.0005 BTC\n',
            RU: '📤 Вывод средств\n' +
                '\n' +
                'ℹ️ Есть два способа вывести средства:\n' +
                ' - BTC Кошелёк - Минимум 0.003 BTC\n' +
                ' - Yobit код - Минимум 0.0005 BTC\n',
        },
        KEYBOARD: {
            US: [
                [ { text: '💰 Wallet', callback_data: 'walletWithdraw' },
                  { text: '🔑 Yobit code', callback_data: 'yobitWithdraw' } ],
                [ { text: '👈 Back', callback_data: 'back' } ]
            ],
            RU: [
                [ { text: '💰 На кошелёк', callback_data: 'walletWithdraw' },
                  { text: '🔑 Yobit код', callback_data: 'yobitWithdraw' } ],
                [ { text: '👈 Назад', callback_data: 'back' } ]
            ],
        }
    },
    NOT_ENOUGH_BALANCE: {
        TEXT: {
            US: 'ℹ️ Not enough funds on balance',
            RU: 'ℹ️ Недостаточно средств на балансе'
        }
    },
    WITHDRAW_ADDRESS: {
        TEXT: {
            US: '📤 Enter address to withdraw BTC:',
            RU: '📤 Введите адрес для вывода BTC:'
        },
        KEYBOARD: {
            US: [ [ { text: '❌ Cancel withdraw' } ] ],
            RU: [ [ { text: '❌ Отменить вывод' } ] ]
        }
    },
    YOBIT_WITHDRAW: {
        TEXT: {
            US: '📤 Enter sum to withdraw.\n' +
                'For examle - 0.02',
            RU: '📤 Введите сумму для вывода.\n' +
                'Например - 0.02'
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
                'ℹ️ Your referrer: {referrerName}\n' +
                '🤝 Invited: {referralsCount}\n' +
                '\n' +
                '🔗 Your invitation link:\n' +
                't.me/{botUsername}?start={userID}',
            RU: '👥 Рефералы\n' +
                '\n' +
                'ℹ️ Вас пригласил: {referrerName}\n' +
                '🤝 Приглашено: {referralsCount}\n' +
                '\n' +
                '🔗 Ваша ссылка для приглашения:\n' +
                't.me/{botUsername}?start={userID}'
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
// export default async (ctx: TelegrafContext, bd: sqlite3.Database) => {
    let user: IUser = await getUser(bd, ctx.from.id)
    let [command, ...args] = ctx.update.callback_query.data.split(':')
    console.log(command, args)
    
    if (!user) {
        ctx.answerCbQuery('❌ Something went wrong')
    } else if (command == 'openMenu') {
        let newText = TEMPLATES.MAIN.TEXT[user.lang].replace('{balance}', balanceToString(user.balance)).replace('{wins}', user.wins.toString())
        ctx.editMessageText(newText, {
            reply_markup: {
                inline_keyboard: TEMPLATES.MAIN.KEYBOARD[user.lang]
            }
        })
    } else if (command == 'freeStake') {
        ctx.answerCbQuery()
        let newText = TEMPLATES.FREE_STAKE.TEXT[user.lang]
        ctx.editMessageText(newText, {
            reply_markup: {
                inline_keyboard: TEMPLATES.FREE_STAKE.KEYBOARD[user.lang]
            }
        })
    } else if (command == 'stake') {
        ctx.answerCbQuery()
        let newText = TEMPLATES.STAKE.TEXT[user.lang]
        ctx.editMessageText(newText, {
            reply_markup: {
                inline_keyboard: TEMPLATES.STAKE.KEYBOARD[user.lang]
            }
        })
    } else if (command == 'placeFreeStake') {
        if (user.freeStake) {
            ctx.answerCbQuery(TEMPLATES.ALREADY_PLACED_FREE_STAKE.TEXT[user.lang])
        } else {
            ctx.answerCbQuery()
            await updateUser(bd, ctx.from.id, 'awaitingMessage', 'freeStake')
            ctx.reply(TEMPLATES.PLACE_FREE_STAKE.TEXT[user.lang], {
                 reply_markup: {
                     keyboard: TEMPLATES.PLACE_FREE_STAKE.KEYBOARD[user.lang],
                     resize_keyboard: true
                 }
            })
        }
    } else if (command == 'placeStake') {
        if (user.stakes.length >= 50) {
            ctx.answerCbQuery(TEMPLATES.TOO_MANY_STAKES.TEXT[user.lang])
        } else if (user.balance < 10000) {
            ctx.answerCbQuery(TEMPLATES.NOT_ENOUGH_BALANCE.TEXT[user.lang])
        } else {
            ctx.answerCbQuery()
            await updateUser(bd, ctx.from.id, 'awaitingMessage', 'stake')
            ctx.reply(TEMPLATES.PLACE_STAKE.TEXT[user.lang], {
                 reply_markup: {
                     keyboard: TEMPLATES.PLACE_STAKE.KEYBOARD[user.lang],
                     resize_keyboard: true
                 }
            })
        }
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
        } else {
            ctx.answerCbQuery('')
            let newText = TEMPLATES.WITHDRAW.TEXT[user.lang]
            ctx.editMessageText(newText, {
                reply_markup: {
                    inline_keyboard: TEMPLATES.WITHDRAW.KEYBOARD[user.lang]
                }
            })
        }
    } else if (command == 'walletWithdraw') {
        if (user.balance < 300000) {
            ctx.answerCbQuery(TEMPLATES.NOT_ENOUGH_BALANCE.TEXT[user.lang])
        } else {
            await updateUser(bd, ctx.from.id, ['awaitingMessage', 'actionData'], ['withdrawAddress', 'walletWithdraw'])
            let newText = TEMPLATES.MAIN.TEXT[user.lang].replace('{balance}', balanceToString(user.balance)).replace('{wins}', user.wins.toString())
            ctx.editMessageText(newText, {
                reply_markup: {
                    inline_keyboard: TEMPLATES.MAIN.KEYBOARD[user.lang]
                }
            })
            ctx.reply(TEMPLATES.WITHDRAW_ADDRESS.TEXT[user.lang], {
                reply_markup: {
                    keyboard: TEMPLATES.WITHDRAW_ADDRESS.KEYBOARD[user.lang],
                    resize_keyboard: true
                }
            })
        }
    } else if (command == 'yobitWithdraw') {
        if (user.balance < 50000) {
            ctx.answerCbQuery(TEMPLATES.NOT_ENOUGH_BALANCE.TEXT[user.lang])
        } else {
            await updateUser(bd, ctx.from.id, ['awaitingMessage', 'actionData'], ['withdrawSum', 'yobitWithdraw'])
            let newText = TEMPLATES.MAIN.TEXT[user.lang].replace('{balance}', balanceToString(user.balance)).replace('{wins}', user.wins.toString())
            ctx.editMessageText(newText, {
                reply_markup: {
                    inline_keyboard: TEMPLATES.MAIN.KEYBOARD[user.lang]
                }
            })
            ctx.reply(TEMPLATES.YOBIT_WITHDRAW.TEXT[user.lang], {
                reply_markup: {
                    keyboard: TEMPLATES.YOBIT_WITHDRAW.KEYBOARD[user.lang],
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
    } else if (command == 'referrals') {
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
    } else {
        ctx.answerCbQuery('❌ Command ' + command + ' not exists')
    }
}
