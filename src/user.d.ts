export declare interface IUser {
    id: number,
    name: string,
    awaitingMessage: 'withdrawAddress' | 'withdrawSum' | 'transactionID' | '',
    actionData: string,
    lang: 'RU' | 'US',
    btcAddress: string,
    balance: {
        btc: number,
        satoshi: number
    },
    withdrawRequest: string,
    wins: number,
    freeStake: string,
    stakes: Array<string>
}

export declare interface IUserRow {
    id: number,
    name: string,
    awaitingMessage: 'withdrawAddress' | 'withdrawSum' | 'transactionID' | '',
    actionData: string,
    lang: 'RU' | 'US',
    btcAddress: string,
    btc: number,
    satoshi: number,
    withdrawRequest: string,
    wins: number,
    freeStake: string,
    stakes: string
}
