import * as dotenv from 'dotenv'
dotenv.config()
import * as fetch from 'node-fetch'
import * as schedule from 'node-schedule'
import * as sqlite3 from 'sqlite3'
import * as mysql from 'mysql2'
import { Telegraf } from 'telegraf'
import { TelegrafContext } from 'telegraf/typings/context'

import handleUserMessage from './handleUserMessage'
import handleAdminMessage from './handleAdminMessage'
import handleUserCallback from './handleUserCallback'
import handleAdminCallback from './handleAdminCallback'

import {
    getFreeStakes,
    getStakes,
    truncateFreeStakes,
    truncateStakes,
    updateBalance,
    getUser,
    updateUser,
    IStake
} from './database'

// import {
//     initDatabase,
//     getFreeStakesLite as getFreeStakes,
//     getStakesLite as getStakes,
//     truncateFreeStakesLite as truncateFreeStakes,
//     truncateStakesLite as truncateStakes,
//     updateBalanceLite as updateBalance ,
//     getUserLite as getUser,
//     updateUserLite as updateUser,
//     IStake
// } from './database'

const sql: mysql.Connection = mysql.createConnection({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DATABASE
})

// const sql: sqlite3.Database = new sqlite3.Database('database.db')

const bot = new Telegraf(process.env.TOKEN)

bot.on('message', async (ctx: TelegrafContext) => {
    try {
        if (ctx.chat.type == 'private') {
            if (ctx.from.id == +process.env.ADMIN_ID) {
                await handleAdminMessage(ctx, sql)
            } else {
                await handleUserMessage(ctx, sql)
            }
        }
    } catch (e) {
        ctx.reply('❌ Непредвиденная ошибка. Попробуйте позже')
        console.log(e)
    }
})

bot.on('callback_query', async (ctx: TelegrafContext) => {
    try {
        if (ctx.from.id == +process.env.ADMIN_ID) {
            await handleAdminCallback(ctx, sql)
        } else {
            await handleUserCallback(ctx, sql)
        }
    } catch (e) {
        ctx.reply('❌ Непредвиденная ошибка. Попробуйте позже')
        console.log(e)
    }
})

async function start() {
    // Creates tables if they not exist
    // await initDatabase(sql)
    bot.launch()
}

start()

process.env.freeStakesPoster = 'true'
process.env.gettingStakes = 'true'

function stopGettingStakes() {
    console.log('stopGettingStakes()')
    // process.env.* - is a string type, so can't use true/false
    process.env.gettingStakes = ''
}

function startGettingStakes() {
    console.log('startGettingStakes()')
    process.env.gettingsStakes = 'true'
}

async function getCourse() {
    console.log('getCourse()')
    let res = await fetch('https://yobit.net/api/3/ticker/btc_usd')
    let json = await res.json()
    if (!json.btc_usd) throw new Error('Incorrect response from yobit')
    return json.btc_usd.avg
}

async function playFreeGame() {
    console.log('playFreeGame()')
    let stakes = await getFreeStakes(sql)
    let players = []
    let course: number
    try {
        course = await getCourse()
        await bot.telegram.sendMessage(process.env.GROUP_ID, '💲 Курс: ' + parseFloat((course * 100).toFixed()) / 100)
    } catch (e) {
        let groupMessage =
            '❌ Во время бесплатной игры произошла ошибка'
        bot.telegram.sendMessage(process.env.GROUP_ID, groupMessage)
        let clearedPlayers = []
        await truncateFreeStakes(sql)
        return
    }
    let firstSortingIteration = true
    stakes.sort((next, prev) => {
        if (firstSortingIteration) {
            firstSortingIteration = false
            if (!players.includes(prev.userID)) players.push(prev.userID)
            if (!players.includes(next.userID)) players.push(next.userID)
        } else {
            if (!players.includes(next.userID)) players.push(next.userID)
        }
        let prevDifferenceWithCourse = Math.abs(parseFloat(prev.prediction) - course)
        let nextDifferenceWithCourse = Math.abs(parseFloat(next.prediction) - course)
        return nextDifferenceWithCourse - prevDifferenceWithCourse
    })

    function isAllPredictionsEquals(stakes: IStake[]) {
        let firstPrediction = stakes[0].prediction
        for (let stake of stakes) {
            if (stake.prediction != firstPrediction) return false
        }
        return true
    }

    if (players.length < 2) {
        let groupMessage =
            'ℹ️ Игра с бесплатными ставками была отменена, так как не набралось нужное количество игроков'
        bot.telegram.sendMessage(process.env.GROUP_ID, groupMessage)
        await truncateFreeStakes(sql)
    } else if (isAllPredictionsEquals(stakes)) {
        let groupMessage =
            'ℹ️ Игра с бесплатными ставками была отменена, так как у всех игроков одинаковый прогноз'
        bot.telegram.sendMessage(process.env.GROUP_ID, groupMessage)
        await truncateFreeStakes(sql)
    } else {
        let winnerStakes: IStake[] = []
        for (let stake of stakes) {
            if (winnerStakes.length == 0) winnerStakes.push(stake)
            else if (parseFloat(stake.prediction) == parseFloat(winnerStakes[0].prediction)) winnerStakes.push(stake)
            else break
        }
        await updateBalance(sql, -process.env.PRIZE_FOR_FREE_STAKE)
        for (let stake of winnerStakes) {
            let user = await getUser(sql, stake.userID)
            if (user.referrer) {
                let referrer = await getUser(sql, user.referrer)
                let prizePerStake = +process.env.PRIZE_FOR_FREE_STAKE / winnerStakes.length
                let userWinSum = Math.floor(prizePerStake * (85/100))
                let referrerPrize = Math.floor(prizePerStake * (10/100))
                let adminPrize = Math.floor(prizePerStake * (5/100))
                bot.telegram.sendMessage(user.id, '❇️ +' + userWinSum)
                await updateUser(sql, user.id, 'balance', user.balance + userWinSum)
                bot.telegram.sendMessage(referrer.id, '👥 +' + referrerPrize)
                await updateUser(sql, user.referrer, 'balance', referrer.balance + referrerPrize)
                await updateBalance(sql, +(adminPrize))
            } else {
                let prizePerStake = +process.env.PRIZE_FOR_FREE_STAKE / winnerStakes.length
                let userWinSum = Math.floor(prizePerStake * (85/100))
                let adminPrize = Math.floor(prizePerStake * (15/100))
                bot.telegram.sendMessage(user.id, '❇️ +' + userWinSum)
                await updateUser(sql, user.id, 'balance', user.balance + userWinSum)
                await updateBalance(sql, +(adminPrize))
            }
            await updateBalance(sql, -(process.env.PRIZE_FOR_FREE_STAKE))
            await updateUser(sql, user.id, 'wins', user.wins + 1)
            let groupMessage =
                '❇️ Пользователь ' + user.name + ' стал победителем в бесплатной игре!'
            bot.telegram.sendMessage(process.env.GROUP_ID, groupMessage)
        }
        await truncateFreeStakes(sql)
    }
}

async function playPaidGame() {
    console.log('playPaidGame()')
    let stakes = await getStakes(sql)
    let players = []
    let course: number
    try {
        course = await getCourse()
        await bot.telegram.sendMessage(process.env.GROUP_ID, '💲 Курс: ' + parseFloat((course * 100).toFixed()) / 100)
    } catch (e) {
        let groupMessage =
            '❌ Во время игры произошла ошибка. Все ставки возвращены игрокам'
        bot.telegram.sendMessage(process.env.GROUP_ID, groupMessage)
        let playersToClear = {}
        for (let stake of stakes) {
            if (!playersToClear[stake.userID.toString()]) {
                playersToClear[stake.userID.toString()] = 1
            } else {
                playersToClear[stake.userID.toString()]++
            }
        }
        for (let player in playersToClear) {
            let user = await getUser(sql, +player)
            await updateUser(sql, +player, 'balance', user.balance + 10000 * playersToClear[player])
        }
        await truncateStakes(sql)
        return
    }
    let firstSortingIteration = true
    stakes.sort((next, prev) => {
        if (firstSortingIteration) {
            firstSortingIteration = false
            if (!players.includes(prev.userID)) players.push(prev.userID)
            if (!players.includes(next.userID)) players.push(next.userID)
        } else {
            if (!players.includes(next.userID)) players.push(next.userID)
        }
        let prevDifferenceWithCourse = Math.abs(parseFloat(prev.prediction) - course)
        let nextDifferenceWithCourse = Math.abs(parseFloat(next.prediction) - course)
        return nextDifferenceWithCourse - prevDifferenceWithCourse
    })

    function isAllPredictionsEquals(stakes: IStake[]) {
        let firstPrediction = stakes[0].prediction
        for (let stake of stakes) {
            if (stake.prediction != firstPrediction) return false
        }
        return true
    }

    if (players.length < 2) {
        let groupMessage =
            'ℹ️ Игра была отменена, так как не набралось нужное количество игроков'
        bot.telegram.sendMessage(process.env.GROUP_ID, groupMessage)
        let playersToClear = {}
        for (let stake of stakes) {
            if (!playersToClear[stake.userID.toString()]) {
                playersToClear[stake.userID.toString()] = 1
            } else {
                playersToClear[stake.userID.toString()]++
            }
        }
        for (let player in playersToClear) {
            let user = await getUser(sql, +player)
            await updateUser(sql, +player, 'balance', user.balance + 10000 * playersToClear[player])
        }
        await truncateStakes(sql)
    } else if (isAllPredictionsEquals(stakes)) {
        let groupMessage =
            'ℹ️ Игра была отменена, так как не набралось нужное количество игроков'
        bot.telegram.sendMessage(process.env.GROUP_ID, groupMessage)
        let playersToClear = {}
        for (let stake of stakes) {
            if (!playersToClear[stake.userID.toString()]) {
                playersToClear[stake.userID.toString()] = 1
            } else {
                playersToClear[stake.userID.toString()]++
            }
        }
        for (let player in playersToClear) {
            let user = await getUser(sql, +player)
            await updateUser(sql, +player, 'balance', user.balance + 10000 * playersToClear[player])
        }
        await truncateStakes(sql)
    } else {
        let winnerStakes: IStake[] = []
        let winnerPlayers: number[] = []
        for (let stake of stakes) {
            if (winnerStakes.length == 0) {
                winnerStakes.push(stake)
                winnerPlayers.push(stake.userID)
            }
            else if (parseFloat(stake.prediction) == parseFloat(winnerStakes[0].prediction)) {
                winnerStakes.push(stake)
                if (!winnerPlayers.includes(stake.userID)) winnerPlayers.push(stake.userID)
            }
            else break
        }
        console.log('Winners stakes: ', winnerStakes)
        console.log('Winners players: ', winnerPlayers)
        let playersAlreadyWon = []
        let totalPrize = stakes.length * 10000
        let prizePerStake = Math.floor(totalPrize / winnerStakes.length)
        for (let stake of winnerStakes) {
            let user = await getUser(sql, stake.userID)
            let userWinSum
            if (user.referrer) {
                let referrer = await getUser(sql, user.referrer)
                userWinSum = Math.floor(prizePerStake * (85/100))
                bot.telegram.sendMessage(user.id, '💸 +' + userWinSum)
                await updateUser(sql, user.id, 'balance', user.balance + userWinSum)
                bot.telegram.sendMessage(referrer.id, '👥 +' + Math.floor(prizePerStake * (10/100)))
                await updateUser(sql, referrer.id, 'balance', referrer.balance + Math.floor(prizePerStake * (10/100)))
                await updateBalance(sql, +Math.floor(prizePerStake * (5/100)))
            } else {
                userWinSum = Math.floor(prizePerStake * (85/100))
                bot.telegram.sendMessage(user.id, '💸 +' + userWinSum)
                await updateUser(sql, user.id, 'balance', user.balance + userWinSum)
                await updateBalance(sql, +Math.floor(prizePerStake * (15/100)))
            }
            if (!playersAlreadyWon.includes(stake.userID)) {
                playersAlreadyWon.push(stake.userID)
                let user = await getUser(sql, stake.userID)
                await updateUser(sql, user.id, 'wins', user.wins + 1)
                let groupMessage =
                    '💸 Пользователь ' + user.name + ' стал победителем в игре Его выигрыш - ' + userWinSum.toString()
                bot.telegram.sendMessage(process.env.GROUP_ID, groupMessage)
            }
        }
        await truncateStakes(sql)
    }
}


schedule.scheduleJob('0 0 15 * * *', stopGettingStakes)

schedule.scheduleJob('0 0 20 * * *', playFreeGame)

schedule.scheduleJob('0 0 21 * * *', playPaidGame)

schedule.scheduleJob('0 3 21 * * *', startGettingStakes)

// schedule.scheduleJob('0 40 10 * * *', stopGettingStakes)
//
// schedule.scheduleJob('0 41 10 * * *', playFreeGame)
//
// schedule.scheduleJob('0 42 10 * * *', playPaidGame)
//
// schedule.scheduleJob('0 43 10 * * *', startGettingStakes)
