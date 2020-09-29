export declare interface IUser {
    id: number,
    name: string,
    vip: 1 | 0,
    ban: 1 | 0,
    referrer: number,
    referrals: number,
    awaitingMessage: 'withdrawAddress' | 'withdrawSum' | 'transactionID' | 'freeStake' | 'stake' | 'groupMessageText' | '',
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
    ban: 1 | 0,
    referrer: number,
    referrals: number,
    awaitingMessage: 'withdrawAddress' | 'withdrawSum' | 'transactionID' | 'freeStake' | 'stake' | 'groupMessageText' | '',
    actionData: string,
    lang: 'RU' | 'US',
    balance: number,
    withdrawRequest: number,
    wins: number,
    freeStake: string,
    stakes: string
}
