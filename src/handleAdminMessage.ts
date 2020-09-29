import * as mysql from 'mysql2'
import { getBalance, getUser, updateUser } from './database'
import { IUser } from './user'
import { TelegrafContext } from 'telegraf/typings/context'

const TEMPLATES = {
    BALANCE_REPLENISHED: {
        TEXT: {
            US: 'ℹ️ Your balance has been replenished by {satoshiCount} satoshi',
            RU: 'ℹ️ Ваш баланс пополнен на {satoshiCount} сатоши'
        }
    },
    DEBITED_FROM_BALANCE: {
        TEXT: {
            US: 'ℹ️ {satoshiCount} satoshi was debited from yout balance',
            RU: 'ℹ️ С вашего баланса списано {satoshiCount} сатоши'
        }
    },
    YOUR_YOBIT_CODE: {
        TEXT: {
            US: '🔑 Your Yobit code: {code}',
            RU: '🔑 Ваш Yobit код: {code}'
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
    
    if (command == '/start') {

    } else if (command == '/add') {
        let user: IUser = await getUser(bd, +args[0])
        if (!user) {
            ctx.reply('❌ Пользователь не найден')
        } else {
            await updateUser(bd, +args[0], 'balance', user.balance + +args[1])
            ctx.reply('✅ Баланс пользователя изменён')
            ctx.telegram.sendMessage(args[0], TEMPLATES.BALANCE_REPLENISHED.TEXT[user.lang].replace('{satoshiCount}', args[1]))
        }
    } else if (command == '/sub') {
        let user: IUser = await getUser(bd, +args[0])
        if (!user) {
            ctx.reply('❌ Пользователь не найден')
        } else {
            await updateUser(bd, +args[0], 'balance', user.balance - +args[1])
            ctx.reply('✅ Баланс пользователя изменён')
            ctx.telegram.sendMessage(args[0], TEMPLATES.BALANCE_REPLENISHED.TEXT[user.lang].replace('{satoshiCount}', args[1]))
        }
    } else if (command == '/userBalance') {
        if (!args[0] || !parseInt(args[0])) {
            ctx.reply('❌ Неправильное использование команды')
        } else {
            let user: IUser = await getUser(bd, +args[0])
            if (!user) {
                ctx.reply('❌ Пользователь не найден')
            } else {
                ctx.reply('💰 Баланс пользователя ' + user.name + ': ' + balanceToString(user.balance) + ' BTC')
            }
        }
    } else if (command == '/sendCode') {
        if (args.length < 2) {
            ctx.reply('❌ Неправильное использование команды')
        } else {
            let user: IUser = await getUser(bd, +args[0])
            if (!user) {
                ctx.reply('❌ Пользователь не найден')
            } else {
                try {
                    await ctx.telegram.sendMessage(args[0], TEMPLATES.YOUR_YOBIT_CODE.TEXT[user.lang].replace('{code}', args[1]))
                } catch (e) {
                    ctx.reply('❌ Ошибка при отправке сообщения пользователю')
                    return
                }
                ctx.reply('✅ Код отправлен')
            }
        }
    } else if (command == '/balance') {
        let balance = await getBalance(bd)
        ctx.reply('💰 Balance: ' + balance.toString())
    } else if (command == '/vip') {
        let user: IUser = await getUser(bd, +args[0])
        if (!user) {
            ctx.reply('❌ Пользователь не найден')
        } else {
            if (!user.vip) {
                await updateUser(bd, +args[0], 'vip', 1)
                ctx.reply('✅ Статус пользователя изменён')
            } else {
                ctx.reply('ℹ️ Пользователь уже имеет статус VIP')
            }
        }
    } else if (command == '/removeVip') {
        let user: IUser = await getUser(bd, +args[0])
        if (!user) {
            ctx.reply('❌ Пользователь не найден')
        } else {
            if (user.vip) {
                await updateUser(bd, +args[0], 'vip', 0)
                ctx.reply('✅ Статус пользователя изменён')
            } else {
                ctx.reply('ℹ️ У пользователя нет статуса VIP')
            }
        }
    } else if (command == '/ban') {
        let user: IUser = await getUser(bd, +args[0])
        if (!user) {
            ctx.reply('❌ Пользователь не найден')
        } else {
            if (!user.ban) {
                await updateUser(bd, +args[0], 'ban', 1)
                ctx.reply('✅ Пользователь забанен')
            } else {
                ctx.reply('ℹ️ Пользователь уже забанен')
            }
        } 
    } else if (command == '/unban') {
        let user: IUser = await getUser(bd, +args[0])
        if (!user) {
            ctx.reply('❌ Пользователь не найден')
        } else {
            if (user.ban) {
                await updateUser(bd, +args[0], 'ban', 0)
                ctx.reply('✅ Пользователь разбанен')
            } else {
                ctx.reply('ℹ️ Пользователь не в бане')
            }
        }
    } else {
        ctx.reply('❌ Неизвестная команда - ' + command.replace('/', ''))
    }
}
