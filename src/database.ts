import { IUser, IUserRow } from './user.d'
import * as mysql from 'mysql2'

export function updateBalance(bd: mysql.Connection, value: number): Promise<boolean> {
    if (!Number.isInteger(value)) Promise.reject('Not integer passed')
    return new Promise((resolve, reject) => {
        bd.query(`UPDATE balance SET balance = balance + ${value}`, (err, queryResult) => {
            if (err) reject(err)
            else resolve(true)
        })
    })
}

export interface IStake {
    userID: number,
    prediction: string
}

export function getFreeStakes(bd: mysql.Connection): Promise<IStake[]> {
    return new Promise((resolve, reject) => {
        bd.query('SELECT * FROM freeStakes', (err, queryResult) => {
            if (err) reject(err)
            else resolve(queryResult as IStake[])
        })
    })
}

export function getStakes(bd: mysql.Connection): Promise<IStake[]> {
    return new Promise((resolve, reject) => {
        bd.query('SELECT * FROM stakes', (err, queryResult) => {
            if (err) reject(err)
            else resolve(queryResult as IStake[])
        })
    })
}

export function truncateFreeStakes(bd: mysql.Connection): Promise<boolean> {
    return new Promise((resolve, reject) => {
        bd.query('TRUNCATE freeStakes', (err, queryResult) => {
            if (err) reject(err)
            else {
                bd.query('UPDATE users SET freeStake = ""', (err, queryResult) => {
                    if (err) reject(err)
                    else resolve(true)
                })
            }
        })
    })
}

export function truncateStakes(bd: mysql.Connection): Promise<boolean> {
    return new Promise((resolve, reject) => {
        bd.query('TRUNCATE stakes', (err, queryResult) => {
            if (err) reject(err)
            else {
                bd.query('UPDATE users SET stakes = ""', (err, queryResult) => {
                    if (err) reject(err)
                    else resolve(true)
                })
            }
        })
    })
}

export function addFreeStake(bd: mysql.Connection, userID: number, prediction: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        bd.query(`INSERT INTO freeStakes (userID, prediction) VALUES (${userID}, "${prediction}")`, (err, queryResult) => {
            if (err) reject(err)
            else resolve(true)
        })
    })
}

export function addStake(bd: mysql.Connection, userID: number, prediction: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        bd.query(`INSERT INTO stakes (userID, prediction) VALUES (${userID}, "${prediction}")`, (err, queryResult) => {
            if (err) reject(err)
            else resolve(true)
        })
    })
}

export function getBalance(bd: mysql.Connection): Promise<number> {
    return new Promise((resolve, reject) => {
        bd.query('SELECT balance FROM balance', (err, queryResult) => {
            if (err) reject(err)
            else resolve(queryResult[0].balance)
        })
    })
}

export function getUser(bd: mysql.Connection, id: number): Promise<IUser> {
    return new Promise((resolve, reject) => {
        bd.query('SELECT IF(EXISTS(SELECT * FROM users WHERE id = ?), 1, 0) AS userExists', [id], (err, queryResult) => {
            if (err) reject(err)
            else if (queryResult[0].userExists) {
                bd.query('SELECT * FROM users WHERE id = ?', [id], (err, queryResult) => {
                    if (err) reject(err)
                    else {
                        let user: IUserRow = queryResult[0]
                        let stakes = user.stakes.split(',')
                        resolve({
                            id: user.id,
                            name: user.name,
                            vip: user.vip,
                            ban: user.ban,
                            referrer: user.referrer,
                            referrals: user.referrals,
                            awaitingMessage: user.awaitingMessage,
                            actionData: user.actionData,
                            lang: user.lang,
                            balance: user.balance,
                            withdrawRequest: user.withdrawRequest,
                            wins: user.wins,
                            freeStake: user.freeStake,
                            stakes: stakes[0] ? stakes : []
                        })
                    }
                })
            }
            else resolve(null)
        })
    })
}

export function addUser(bd: mysql.Connection, id: number, name: string, referrerID?: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
        bd.query(`
            INSERT INTO users (
                id,
                name,
                vip,
                ban,
                referrer,
                referrals,
                awaitingMessage,
                actionData,
                lang,
                balance,
                withdrawRequest,
                wins,
                freeStake,
                stakes
            )
            VALUES (${id}, "${name}", 0, 0, ${referrerID ? referrerID : 0}, 0, "", "", "", 0, 0, 0, "", "")
        `,
        (err, res) => {
            if (err) reject(err)
            else resolve(true)
        })
    })
}

type UserRowField = 'id' | 'name' | 'vip' | 'ban' | 'refferer' | 'referrals' | 'awaitingMessage' | 'actionData' | 'lang' | 'balance' | 'withdrawRequest' | 'wins' | 'freeStake' | 'stakes'
export function updateUser(bd: mysql.Connection, id: number, fields: Array<UserRowField>, values: Array<string | number>): Promise<boolean>
export function updateUser(bd: mysql.Connection, id: number, filed: UserRowField, value: string | number): Promise<boolean>
export function updateUser(bd, id, fields, values) {
    return new Promise((resolve, reject) => {
        let queryFields: string = ''
        if (typeof fields == 'string') {
            queryFields = `${fields}="${values}"`
        } else {
            for (let field in fields) {
                queryFields += `${fields[field]}="${values[field]}"`
                if (fields.length - +field - 1) queryFields += ','
                queryFields += ' '
            }
        }
        bd.query(
            `
            UPDATE users
            SET
            ${queryFields}
            WHERE id = ${id}
            `,
            (err, res) => {
                if (err) reject(err)
                else resolve(true)
            }
        )
    })
}

import * as sqlite3 from 'sqlite3'

function createTableUsers(bd: sqlite3.Database) {
    return new Promise((resolve, reject) => {
        bd.run(`
            CREATE TABLE IF NOT EXISTS users(
                id int,
                name text,
                vip int,
                ban int,
                referrer int,
                referrals int,
                awaitingMessage text,
                actionData text,
                lang text,
                balance int,
                withdrawRequest,
                wins int,
                freeStake text,
                stakes text
            )
        `, err => {
            if (err) reject(err)
            resolve(true)
        })
    })
}

function createTableFreeStakes(bd: sqlite3.Database) {
    return new Promise((resolve, reject) => {
        bd.run(`
            CREATE TABLE IF NOT EXISTS freeStakes(
                userID int,
                stake text
            )
        `, err => {
            if (err) reject(err)
            resolve(true)
        })
    })
}

function createTableStakes(bd: sqlite3.Database) {
    return new Promise((resolve, reject) => {
        bd.run(`
            CREATE TABLE IF NOT EXISTS stakes(
                userID int,
                stake text
            )
        `, err => {
            if (err) reject(err)
            resolve(true)
        })
    })
}

function createTableBalance(bd: sqlite3.Database) {
    return new Promise((resolve, reject) => {
        bd.run(`
            CREATE TABLE IF NOT EXISTS balance(
                balance int
            )
        `, err => {
            if (err) reject(err)
            bd.run(`
                INSERT INTO balance (balance) VALUES (0)
            `, err => {
                if (err) reject(err)
                resolve(true)
            })
        })
    })
}

export async function initDatabase(bd: sqlite3.Database) {
    let query1 = createTableUsers(bd)
    let query2 = createTableFreeStakes(bd)
    let query3 = createTableStakes(bd)
    let query4 = createTableBalance(bd)
    await query1; await query2; await query3; await query4
    return true
}

export function updateBalanceLite(bd: sqlite3.Database, value: number): Promise<boolean> {
    if (!Number.isInteger(value)) Promise.reject('Not integer passed')
    return new Promise((resolve, reject) => {
        bd.run(`UPDATE balance SET balance = balance + ${value}`, (err, queryResult) => {
            if (err) reject(err)
            else resolve(true)
        })
    })
}

export function getFreeStakesLite(bd: sqlite3.Database,): Promise<IStake[]> {
    return new Promise((resolve, reject) => {
        bd.all('SELECT * FROM freeStakes', (err, rows) => {
            if (err) reject(err)
            else resolve(rows as IStake[])
        })
    })
}

export function getStakesLite(bd: sqlite3.Database): Promise<IStake[]> {
    return new Promise((resolve, reject) => {
        bd.all('SELECT * FROM stakes', (err, rows) => {
            if (err) reject(err)
            else resolve(rows as IStake[])
        })
    })
}

export function truncateFreeStakesLite(bd: sqlite3.Database): Promise<boolean> {
    return new Promise((resolve, reject) => {
        bd.run('TRUNCATE freeStakes', err => {
            if (err) reject(err)
            else {
                bd.run('UPDATE users SET freeStake = ""', err => {
                    if (err) reject(err)
                    else resolve(true)
                })
            }
        })
    })
}

export function truncateStakesLite(bd: sqlite3.Database): Promise<boolean> {
    return new Promise((resolve, reject) => {
        bd.run('TRUNCATE stakes', (err, queryResult) => {
            if (err) reject(err)
            else {
                bd.run('UPDATE users SET stakes = ""', err => {
                    if (err) reject(err)
                    else resolve(true)
                })
            }
        })
    })
}

export function addFreeStakeLite(bd: sqlite3.Database, userID: number, prediction: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        bd.run(`INSERT INTO freeStakes (userID, prediction) VALUES (${userID}, "${prediction}")`, err => {
            if (err) reject(err)
            else resolve(true)
        })
    })
}

export function addStakeLite(bd: sqlite3.Database, userID: number, prediction: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        bd.run(`INSERT INTO stakes (userID, prediction) VALUES (${userID}, "${prediction}")`, err => {
            if (err) reject(err)
            else resolve(true)
        })
    })
}

export function getBalanceLite(bd: sqlite3.Database): Promise<number> {
    return new Promise((resolve, reject) => {
        bd.get('SELECT balance FROM balance', (err, row) => {
            if (err) reject(err)
            else if (!row.balance) reject('No balance in balance table')
            else resolve(row.balance)
        })
    })
}

export function getUserLite(bd: sqlite3.Database, id: number): Promise<IUser> {
    return new Promise((resolve, reject) => {
        bd.get('SELECT * FROM users WHERE id = ?', [id], (err, user: IUserRow | null) => {
            if (err) reject(err)
            else if (!user) resolve(null)
            else {
                let stakes = user.stakes.split(',')
                resolve({
                    id: user.id,
                    name: user.name,
                    vip: user.vip,
                    ban: user.ban,
                    referrer: user.referrer,
                    referrals: user.referrals,
                    awaitingMessage: user.awaitingMessage,
                    actionData: user.actionData,
                    lang: user.lang,
                    balance: user.balance,
                    withdrawRequest: user.withdrawRequest,
                    wins: user.wins,
                    freeStake: user.freeStake,
                    stakes: stakes.length ? stakes : []
                })
            }
        })
    })
}

export function addUserLite(bd: sqlite3.Database, id: number, name: string, referrerID?: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
        bd.run(`
            INSERT INTO users (
                id,
                name,
                vip,
                ban,
                referrer,
                referrals,
                awaitingMessage,
                actionData,
                lang,
                balance,
                withdrawRequest,
                wins,
                freeStake,
                stakes
            )
            VALUES (${id}, "${name}", 0, 0, ${referrerID ? referrerID : 0}, 0, "", "", "", 0, 0, 0, "", "")
        `,
        err => {
            if (err) reject(err)
            else resolve(true)
        })
    })
}

export function updateUserLite(bd: sqlite3.Database, id: number, fields: Array<UserRowField>, values: Array<string | number>): Promise<boolean>
export function updateUserLite(bd: sqlite3.Database, id: number, filed: UserRowField, value: string | number): Promise<boolean>
export function updateUserLite(bd, id, fields, values) {
    return new Promise((resolve, reject) => {
        let queryFields: string = ''
        if (typeof fields == 'string') {
            queryFields = `${fields}="${values}"`
        } else {
            for (let field in fields) {
                queryFields += `${fields[field]}="${values[field]}"`
                if (fields.length - +field - 1) queryFields += ','
                queryFields += ' '
            }
        }
        bd.run(`UPDATE users SET ${queryFields} WHERE id = ${id}`, err => {
            if (err) reject(err)
            else resolve(true)
        })
    })
}
