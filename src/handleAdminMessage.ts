import * as mysql from 'mysql2'
import { getUser, updateUser } from './users'
import { IUser } from './user'
import { TelegrafContext } from 'telegraf/typings/context'

const TEMPLATES = {
    BALANCE_REPLENISHED: {
        TEXT: {
            RU: 'ℹ️ Ваш баланс пополнен на {satoshiCount} сатоши',
            US: 'ℹ️ Your balance has been replenished by {satoshiCount} satoshi'
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
        let user: IUser = await getUser(bd, +args[0])
        if (!user) {
            ctx.reply('❌ Пользователь не найден')
        } else {
            ctx.reply('💰 Баланс пользователя ' + user.name + ': ' + balanceToString(user.balance) + ' BTC')
        }
    } else if (command == '/balance') {
        
    } else {
        ctx.reply('❌ Неизвестная команда - ' + command.replace('/', ''))
    }
}
