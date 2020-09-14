import * as fetch from 'node-fetch'

let rootURL: string = 'https://block.io/api/v2/'

export interface IBlockIOApi {
    token: string;

    /**
     * Gets current accout balance
     */
    getBalance(): Promise<string>;

    /**
     * Creates new address on block.io and returns it's address and label
     * @param label If passed, this label will be specified to the address
     */
    getNewAddress(label?: string): Promise<{address: string, label: string}>

    /**
     * Returns existing address on block.io if it exists
     * @param label Used to find existing address
     */
    getAddressByLabel(label: string): Promise<{address: string, label: string}>
}

export default class BlockIOApi implements IBlockIOApi {
    token: string

    constructor(token: string) {
        this.token = token
    }
    
    async getBalance(): Promise<string> {
        let res = await fetch(rootURL + 'get_balance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                api_key: this.token
            })
        })
        let result
        try {
            result = await res.json()
        } catch (e) {
            throw new Error('Cannot parse response (Not JSON)')
        }
        if (result.status == 'success') return result.data.available_balance
        else throw result
    }
    
    async getNewAddress(label: string = ''): Promise<{address: string, label: string}> {
        let res = await fetch(rootURL + 'get_new_address', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                api_key: this.token,
                label: label
            })
        })
        let result
        try {
            result = await res.json()
        } catch (e) {
            throw new Error('Cannot parse response (Not JSON)')
        }
        if (result.status == 'success') return {
            address: result.data.address as string,
            label: result.data.label as string
        }
        else throw result
    }

    async getAddressByLabel(label: string): Promise<{address: string, label: string}> {
        let res = await fetch(rootURL + 'get_address_by_label', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                api_key: this.token,
                label: label
            })
        })
        let result
        try {
            result = await res.json()
        } catch (e) {
            throw new Error('Cannot parse response (Not JSON)')
        }
        if (result.status == 'success') return {
            address: result.data.address as string,
            label: result.data.label as string
        }
        else throw result
    }
}

