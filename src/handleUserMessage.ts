import mf from './md_friendly'
import * as mysql from 'mysql2'
import { addUser, getUser, updateUser, addStake, addFreeStake } from './database'
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
    YOU_BANNED: {
        TEXT: {
            US: '❌ You banned',
            RU: '❌ Вы забанены'
        }
    },
    NOT_NUMBER_STAKE: {
        TEXT: {
            US: '❌ Not correct prediction',
            RU: '❌ Некорректный ввод прогноза'
        }
    },
    TOO_LONG_FLOATING_PART: {
        TEXT: {
            US: '❌ Prediction floating part limit is 2',
            RU: '❌ Максимальное количество знаков в плавающей части прогноза - 2'
        }
    },
    TOO_BIG_NUMBER_IN_PREDICTION: {
        TEXT: {
            US: '❌ Prediction can\'t be bigger than 100000 USD',
            RU: '❌ Прогноз не может быть больше 100000 USD'
        }
    },
    STAKE_REQUEST_CANCELED: {
        TEXT: {
            US: 'ℹ️ Stake canceled',
            RU: 'ℹ️ Ставка отменена',
        }
    },
    TOO_LONG_GROUP_MESSAGE: {
        TEXT: {
            US: '❌ Max message lenght is 250 chars',
            RU: '❌ Максимальная длина сообщения - 250 символов'
        }
    },
    FREE_STAKE_CREATED: {
        TEXT: {
            US: '✅ Prediction accepted',
            RU: '✅ Прогноз принят'
        }
    },
    GAME_NOT_STARTED: {
        TEXT: {
            US: 'ℹ️ No stakes accepted now. Press "cancel" button to cancel stake',
            RU: 'ℹ️ Ставки сейчас не принимаются. Нажмите кнопку отмены, чтобы отменить ставку'
        }
    },
    STAKE_CREATED: {
        TEXT: {
            US: '✅ Prediction accepted',
            RU: '✅ Прогноз принят'
        }
    },
    YOU_CAN_LEAVE_A_MESSAGE: {
        TEXT: {
            US: 'ℹ️ As you are VIP user, you can leave a message to post it in group:',
            RU: 'ℹ️ Так как вы VIP пользователь, вы можете оставить сообщение, которое будет опубликовано в группе:'
        },
        KEYBOARD: {
            US: [
                [ { text: '❌ Cancel stake' }, { text: '👉 Skip' } ]
            ],
            RU: [
                [ { text: '❌ Отменить ставку' }, { text: '👉 Пропустить' } ]
            ]
        }
    },
    TOO_LONG_TRANSACTION_ID: {
        TEXT: {
            US: '❌ Too long transaction ID',
            RU: '❌ Слишком длинный ID транзакции'
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
            US: '📤 Now enter sum you want to withdraw (Example: 0.02):',
            RU: '📤 Теперь введите сумму, которую хотите вывести (Например: 0.02):'
        }
    },
    INCORRECT_SUM: {
        TEXT: {
            US: '❌ Incorrect input sum',
            RU: '❌ Некорректный ввод'
        }
    },
    WITHDRAW_NOT_ENOUGH_FUNDS_ON_BALANCE: {
        TEXT: {
            US: '❌ You have no this sum on your balance',
            RU: '❌ У вас недостаточно средств на балансе'
        }
    },
    WITHDRAW_REQUEST_LESS_THAN_MIN_WALLET_SUM: {
        TEXT: {
            US: '❌ Minimal sum to withdraw is: 0.003 BTC',
            RU: '❌ Минимальная сумма для вывода: 0.003 BTC'
        }
    },
    WITHDRAW_REQUEST_LESS_THAN_MIN_YOBIT_SUM: {
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
            let p1 = addUser(bd, ctx.from.id, ctx.from.username || ctx.from.first_name, referrerID)
            let p2 = updateUser(bd, referrerID, 'referrals', referrer.referrals + 1)
            await p1; await p2;
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
    
    if (user.ban) {
        ctx.reply(TEMPLATES.YOU_BANNED.TEXT[user.lang])
    } else if (user.awaitingMessage == 'freeStake') {
        let messageText = ctx.message.text.toLowerCase().replace(/[,]/g, '.')
        if (messageText.includes('отменить') || messageText.includes('cancel')) {
            await updateUser(bd, ctx.from.id, 'awaitingMessage', '')
            ctx.reply(TEMPLATES.STAKE_REQUEST_CANCELED.TEXT[user.lang], {
                reply_markup: {
                    remove_keyboard: true
                }
            })
        } else if (!process.env.gettingStakes) {
            ctx.reply(TEMPLATES.GAME_NOT_STARTED.TEXT[user.lang])
        } else if (isNaN(parseFloat(messageText))) {
            ctx.reply(TEMPLATES.NOT_NUMBER_STAKE.TEXT[user.lang])
        } else if (parseFloat(parseFloat(messageText).toFixed(2)) != parseFloat(messageText)) {
            ctx.reply(TEMPLATES.TOO_LONG_FLOATING_PART.TEXT[user.lang])
        } else if (parseFloat(messageText) > 100000) {
            ctx.reply(TEMPLATES.TOO_BIG_NUMBER_IN_PREDICTION.TEXT[user.lang])
        } else if (parseFloat(messageText) <= 0) {
            ctx.reply(TEMPLATES.NOT_NUMBER_STAKE.TEXT[user.lang])
        } else {
            await addFreeStake(bd, user.id, messageText)
            await updateUser(bd, ctx.from.id, ['freeStake', 'awaitingMessage'], [messageText, ''])
            ctx.reply(TEMPLATES.FREE_STAKE_CREATED.TEXT[user.lang], {
                reply_markup: {
                    remove_keyboard: true
                }
            })
            let groupMessageText =
                `👤 Пользователь ${user.name}\n` +
                `❇️ Сделал бесплатную ставку\n` +
                `💲 Его прогноз: ${messageText}`
                ctx.telegram.sendMessage(process.env.GROUP_ID, groupMessageText)
        }
    } else if (user.awaitingMessage == 'stake') {
        let messageText = ctx.message.text.toLowerCase().replace(/[,]/g, '.')
        if (messageText.includes('отменить') || messageText.includes('cancel')) {
            await updateUser(bd, ctx.from.id, 'awaitingMessage', '')
            ctx.reply(TEMPLATES.STAKE_REQUEST_CANCELED.TEXT[user.lang], {
                reply_markup: {
                    remove_keyboard: true
                }
            })
        } else if (!process.env.gettingStakes) {
            ctx.reply(TEMPLATES.GAME_NOT_STARTED.TEXT[user.lang])
        } else if (isNaN(parseFloat(messageText))) {
            ctx.reply(TEMPLATES.NOT_NUMBER_STAKE.TEXT[user.lang])
        } else if (parseFloat(parseFloat(messageText).toFixed(2)) != parseFloat(messageText)) {
            ctx.reply(TEMPLATES.TOO_LONG_FLOATING_PART.TEXT[user.lang])
        } else if (parseFloat(messageText) > 100000) {
            ctx.reply(TEMPLATES.TOO_BIG_NUMBER_IN_PREDICTION.TEXT[user.lang])
        } else if (parseFloat(messageText) <= 0) {
            ctx.reply(TEMPLATES.NOT_NUMBER_STAKE.TEXT[user.lang])
        } else {
            if (!user.vip) {
                await addStake(bd, user.id, messageText)
                let newUserStakes = user.stakes.join(',')
                if (newUserStakes) newUserStakes += ','
                newUserStakes += messageText
                let groupMessageText =
                    `👤 Пользователь ${user.name}\n` +
                    `💸 Сделал ставку\n` +
                    `💲 Его прогноз: ${messageText}`
                ctx.telegram.sendMessage(process.env.GROUP_ID, groupMessageText)
                await updateUser(bd, ctx.from.id, ['stakes', 'balance', 'awaitingMessage'], [newUserStakes, user.balance - 10000, ''])
                ctx.reply(TEMPLATES.STAKE_CREATED.TEXT[user.lang], {
                    reply_markup: {
                        remove_keyboard: true
                    }
                })
            } else {
                await updateUser(bd, ctx.from.id, ['actionData', 'awaitingMessage'], [messageText, 'groupMessageText'])
                ctx.reply(TEMPLATES.YOU_CAN_LEAVE_A_MESSAGE.TEXT[user.lang], {
                    reply_markup: {
                        keyboard: TEMPLATES.YOU_CAN_LEAVE_A_MESSAGE.KEYBOARD[user.lang],
                        resize_keyboard: true
                    }
                })
            }
        }
    } else if (user.awaitingMessage == 'groupMessageText') {
        let messageText = ctx.message.text.toLowerCase().replace(/[,]/g, '.')
        if (messageText.includes('cancel') || messageText.includes('отменить')) {
            await updateUser(bd, ctx.from.id, ['actionData', 'awaitingMessage'], ['', ''])
            ctx.reply(TEMPLATES.STAKE_REQUEST_CANCELED.TEXT[user.lang], {
                reply_markup: {
                    remove_keyboard: true
                }
            })
        } else if (messageText.includes('skip') || messageText.includes('пропустить')) {
            await addStake(bd, user.id, user.actionData)
            let newUserStakes = user.stakes.join(',')
            if (newUserStakes) newUserStakes += ','
            newUserStakes += user.actionData
            let groupMessageText =
                `👤 VIP Пользователь ${user.name}\n` +
                `💸 Сделал ставку\n` +
                `💲 Его прогноз: ${user.actionData}`
            ctx.telegram.sendMessage(process.env.GROUP_ID, groupMessageText)
            await updateUser(bd, ctx.from.id, ['stakes', 'balance', 'awaitingMessage'], [newUserStakes, user.balance - 10000, ''])
            ctx.reply(TEMPLATES.STAKE_CREATED.TEXT[user.lang], {
                reply_markup: {
                    remove_keyboard: true
                }
            })
        } else if (ctx.message.text.length > 250) {
            ctx.reply(TEMPLATES.TOO_LONG_GROUP_MESSAGE.TEXT[user.lang])
        } else {
            await addStake(bd, user.id, user.actionData)
            let newUserStakes = user.stakes.join(',')
            if (newUserStakes) newUserStakes += ','
            newUserStakes += messageText
            let groupMessageText =
                `👤 VIP Пользователь ${user.name}\n` +
                `💸 Сделал ставку\n` +
                `💲 Его прогноз: ${user.actionData}\n` +
                `✉️ Сообщение пользователя: ${ctx.message.text}`
            ctx.telegram.sendMessage(process.env.GROUP_ID, groupMessageText)
            await updateUser(bd, ctx.from.id, ['stakes', 'balance', 'awaitingMessage'], [newUserStakes, user.balance - 10000, ''])
            ctx.reply(TEMPLATES.STAKE_CREATED.TEXT[user.lang], {
                reply_markup: {
                    remove_keyboard: true
                 }
            })
        }
    } else if (user.awaitingMessage == 'withdrawAddress') {
        let messageText = ctx.message.text.toLowerCase()
        if (messageText.includes('отменить') || messageText.includes('cancel')) {
            await updateUser(bd, ctx.from.id, 'awaitingMessage', '')
            ctx.reply(TEMPLATES.WITHDRAW_REQUEST_CANCELED.TEXT[user.lang], {
                reply_markup: {
                    remove_keyboard: true
                }
            })
        } else {
            await updateUser(bd, ctx.from.id, ['actionData', 'awaitingMessage'], [`${user.actionData},${ctx.message.text.replace(/[,]/g, '')}`, 'withdrawSum'])
            ctx.reply(TEMPLATES.WITHDRAW_ENTER_SUM.TEXT[user.lang])
        }
    } else if (user.awaitingMessage == 'withdrawSum') {
        let messageText = ctx.message.text.toLowerCase()
        let sum = ctx.message.text.replace(/[,]/g, '.')
        if (messageText.includes('отменить') || messageText.includes('cancel')) {
            await updateUser(bd, ctx.from.id, ['actionData', 'awaitingMessage'], ['', ''])
            ctx.reply(TEMPLATES.WITHDRAW_REQUEST_CANCELED.TEXT[user.lang], {
                reply_markup: {
                    remove_keyboard: true
                }
            })
        } else if (user.balance < +(parseFloat(sum) * 100000000).toFixed(0)) {
            ctx.reply(TEMPLATES.WITHDRAW_NOT_ENOUGH_FUNDS_ON_BALANCE.TEXT[user.lang])
        } else if (!parseFloat(sum)) {
            ctx.reply(TEMPLATES.INCORRECT_SUM.TEXT[user.lang])
        } else if (user.actionData == 'yobitWithdraw' && parseFloat(sum) < 0.0005) {
            ctx.reply(TEMPLATES.WITHDRAW_REQUEST_LESS_THAN_MIN_YOBIT_SUM.TEXT[user.lang])
        } else if (user.actionData != 'yobitWithdraw' && parseFloat(sum) < 0.003) {
            ctx.reply(TEMPLATES.WITHDRAW_REQUEST_LESS_THAN_MIN_WALLET_SUM.TEXT[user.lang])
        } else {
            await updateUser(bd, ctx.from.id, ['actionData', 'awaitingMessage'], ['', ''])
            let messageToAdmin =
                `📤 Вывод ${user.actionData == 'yobitWithdraw' ? '\\(Yobit код\\)' : '\\(На кошелёк\\)'}\n` +
                `👤 [${mf(user.name)}](tg://user?id=${user.id}) \\(${user.id}\\)\n` +
                `💰 Сумма вывода: ${mf(sum)}\n` +
                `💳 Баланс пользователя: ${mf(balanceToString(user.balance))}\n` +
                (user.actionData != 'yobitWithdraw' ? ('💰 Кошелёк: ' + mf(user.actionData.split(',')[1])) : '')
            ctx.telegram.sendMessage(process.env.ADMIN_ID, messageToAdmin, {
                parse_mode: 'MarkdownV2',
                reply_markup: {
                    inline_keyboard: [
                        [ { text: '♻️ Готово', callback_data: 'removeRequest' } ]
                    ]
                }
            })
            ctx.reply(TEMPLATES.WITHDRAW_REQUEST_CREATED.TEXT[user.lang], {
                reply_markup: {
                    remove_keyboard: true
                }
            })
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
            if (transactionID.length > 100) {
                ctx.reply(TEMPLATES.TOO_LONG_TRANSACTION_ID.TEXT[user.lang])
            } else {
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
                ctx.reply(TEMPLATES.DEPOSIT_REQUEST_CREATED.TEXT[user.lang], {
                    reply_markup: {
                        remove_keyboard: true
                    }
                })
            }
        }
    } else {
        let replyText = TEMPLATES.MAIN.TEXT[user.lang].replace('{balance}', balanceToString(user.balance)).replace('{wins}', user.wins.toString())
        ctx.reply(replyText, {
            reply_markup: {
                inline_keyboard: TEMPLATES.MAIN.KEYBOARD[user.lang]
            }
        })
    }
}
