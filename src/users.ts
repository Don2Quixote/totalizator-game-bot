import { IUser, IUserRow } from './user.d'
import * as mysql from 'mysql2'

export async function getUser(bd: mysql.Connection, id: number): Promise<IUser> {
    return new Promise((resolve, reject) => {
        bd.query('SELECT IF(EXISTS(SELECT * FROM users WHERE id = ?), 1, 0) AS userExists', [id], (err, queryResult) => {
            let result = queryResult[0]
            if (err) reject(err)
            else if (result.userExists) {
                bd.query('SELECT * FROM users WHERE id = ?', [id], (err, queryResult) => {
                    if (err) reject(err)
                    else {
                        let user: IUserRow = queryResult[0]
                        let stakes = user.stakes.split(',')
                        resolve({
                            id: user.id,
                            name: user.name,
                            vip: user.vip,
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

export async function addUser(bd, id: number, name: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        bd.query(`
            INSERT INTO users (
                id,
                name,
                vip,
                awaitingMessage,
                actionData,
                lang,
                balance,
                withdrawRequest,
                wins,
                freeStake,
                stakes
            )
            VALUES (${id}, "${name}", 0, "", "", "", 0, 0, 0, "", "")
        `,
        (err, res) => {
            if (err) reject(err)
            else resolve(true)
        })
    })
}

type UserRowField = 'id' | 'name' | 'vip' | 'awaitingMessage' | 'actionData' | 'lang' | 'balance' | 'withdrawRequest' | 'wins' | 'freeStake' | 'stakes'
export async function updateUser(bd: mysql.Connection, id: number, fields: Array<UserRowField>, values: Array<string | number>): Promise<boolean>
export async function updateUser(bd: mysql.Connection, id: number, filed: UserRowField, value: string | number): Promise<boolean>
export async function updateUser(bd, id, fields, values) {
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
        let query = 
            `
            UPDATE users
            SET
            ${queryFields}
            WHERE id = ${id}
            `
        console.log(query)
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
    });
}

