export declare interface IUser {
    id: number,
    name: string,
    vip: 1 | 0,
    awaitingMessage: 'withdrawAddress' | 'withdrawSum' | 'transactionID' | '',
    actionData: string,
    lang: 'RU' | 'US',
    balance: number,
    withdrawRequest: number,
    wins: number,
    freeStake: string,
    stakes: Array<string>
}

export declare interface IUserRow {
    id: number,
    name: string,
    vip: 1 | 0,
    awaitingMessage: 'withdrawAddress' | 'withdrawSum' | 'transactionID' | '',
    actionData: string,
    lang: 'RU' | 'US',
    balance: number,
    withdrawRequest: number,
    wins: number,
    freeStake: string,
    stakes: string
}
