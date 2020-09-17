import * as dotenv from 'dotenv'
dotenv.config()
import { IBlockIOApi } from './blockIOApi'
import BlockIOApi from './blockIOApi'
import * as mysql from 'mysql2'
import { Telegraf } from 'telegraf'
import { TelegrafContext } from 'telegraf/typings/context'

let blockio = new BlockIOApi(process.env.BLOCKIO_TOKEN)

const sql: mysql.Connection = mysql.createConnection({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DATABASE
})

const bot = new Telegraf(process.env.TOKEN)

import handleUserMessage from './handleUserMessage'
import handleAdminMessage from './handleAdminMessage'
bot.on('message', async (ctx: TelegrafContext) => {
    try {
        if (ctx.from.id == +process.env.ADMIN_ID) {
            await handleAdminMessage(ctx, sql)
        } else {
            await handleUserMessage(ctx, sql)
        }
    } catch (e) {
        ctx.reply('❌ Непредвиденная ошибка. Попробуйте позже')
        console.log(e)
    }
})

import handleUserCallback from './handleUserCallback'
bot.on('callback_query', async (ctx: TelegrafContext) => {
    try {
        await handleUserCallback(ctx, sql)
    } catch (e) {
        ctx.reply('❌ Непредвиденная ошибка. Попробуйте позже')
        console.log(e)
    }
})

bot.launch()

