export declare interface IUser {
    id: number,
    name: string,
    lang: string,
    btcAddress: string,
    balance: {
        btc: number,
        satoshi: number
    },
    wins: number,
    freeStake: string,
    stakes: Array<string>
}

export declare interface IUserRow {
    id: number,
    name: string,
    lang: string,
    btcAddress: string,
    btc: number,
    satoshi: number,
    wins: number,
    freeStake: string,
    stakes: string
}
