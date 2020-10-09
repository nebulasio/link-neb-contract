/** Local simulation environment code; Do not modify */
const neblocal = require('../../lib/neblocal')
const crypto = require('../../lib/crypto')
const BigNumber = require('bignumber.js')
const utils = require('nebulas/lib/utils/utils')
const Blockchain = neblocal.Blockchain
const LocalContractStorage = neblocal.LocalContractStorage
const Event = neblocal.Event
/** Local simulation environment code; End. */

class Utils {

    static isNull(o) {
        return typeof o === 'undefined' || o == null
    }

    static verifyBool(o) {
        if (typeof o !== 'boolean') {
            throw new Error(`${o} is not a boolean type`)
        }
    }

    static transferNAS(to, value) {
        if (!Blockchain.transfer(to, value)) {
            throw new Error('transfer failed.')
        }
    }
}

class BaseContract {

    constructor(name) {
        this.__contractName = name
        LocalContractStorage.defineProperty(this, '_config', null)
    }

    get config() {
        if (!this.__config) {
            this.__config = this._config
        }
        return this.__config
    }

    init(multiSig) {
        this._verifyAddress(multiSig)
        this._config = {
            multiSig: multiSig
        }
    }

    setConfig(config) {
        this._verifyFromMultiSig()
        this._config = config
    }

    getConfig() {
        return this.config
    }

    _verifyFromMultiSig() {
        if (Blockchain.transaction.from !== this.config.multiSig) {
            throw new Error('No permissions.')
        }
    }

    _verifyFromAssetManager() {
        if (this.config.assetManagers.indexOf(Blockchain.transaction.from) < 0) {
            throw new Error('No asset permissions.')
        }
    }

    _verifyFromDataManager() {
        if (this.config.dataManagers.indexOf(Blockchain.transaction.from) < 0) {
            throw new Error('No data permissions.')
        }
    }

    _verifyAddress(address) {
        if (Blockchain.verifyAddress(address) === 0) {
            throw new Error(`Not a valid address: ${address}`)
        }
    }

    _verifyEthAddress(address) {
        if (address.length != 42 || address.indexOf('0x') < 0) {
            throw new Error(`Not a vaild eth address: ${address}`)
        }
    }

    _verifyTokenSupported(token) {
        if (Utils.isNull(this.config.tokens[token])) {
            throw new Error(`Not a supported token: ${token}`)
        }
    }

    _tokenContract(token) {
        this._verifyTokenSupported(token)
        return new Blockchain.Contract(this.config.tokens[token])
    }

}

class LinkProxy extends BaseContract {

    constructor() {
        super('LinkProxy')
    }

    get linkContract() {
        if (Utils.isNull(this._linkContract)) {
            this._linkContract = new Blockchain.Contract(this.config.link)
        }
        return this._linkContract
    }

    accept() {
        Event.Trigger('transfer', {
            from: Blockchain.transaction.from,
            to: Blockchain.transaction.to,
            value: Blockchain.transaction.value,
        })
    }

    // 管理员提款
    transferFund(token, toAddr, amount) {
        if (!toAddr) {
            toAddr = Blockchain.transaction.from
        }
        this._verifyFromAssetManager()
        if (token.toLocaleUpperCase() === "NAS") {
            Utils.transferNAS(toAddr, amount)
        } else {
            let tokenContract = this._tokenContract(token)
            tokenContract.call('transfer', toAddr, amount)
        }
        Event.Trigger("LinkProxy: transferFund", {
            Transfer: {
                from: Blockchain.transaction.to,
                to: toAddr,
                token: token,
                value: amount
            }
        })
    }

    updateMappingAccount(ethAddr) {
        return this.linkContract.call('updateMappingAccount', Blockchain.transaction.from, ethAddr)
    }

    getMappingAccount(addr) {
        return this.linkContract.call('getMappingAccount', addr)
    }

    stake(token, ethAddr, amount) {
        let from = Blockchain.transaction.from
        let stakeId = this.linkContract.call('stake', token, from, ethAddr, amount)

        let tokenContract = this._tokenContract(token)
        tokenContract.call('transferFrom', from, Blockchain.transaction.to, amount)
        this._stakeEvent(token, from, ethAddr, amount)
        return stakeId
    }

    _stakeEvent(token, from, to, amount) {
        Event.Trigger('Link', {
            Status: true,
            Stake: {
                token: token,
                from: from,
                to: to,
                value: amount
            }
        });
    }

    burnStake(key) {
        this._verifyFromAssetManager()

        let data = this.getStakeData(key)
        if (utils.isNull(data)) {
            throw new Error(`Burn stake not found: ${key}`)
        }

        const value = new BigNumber(data.amount).toString(10)
        this._tokenContract(data.token).call('burn', [{addr:data.nebAddr, value: value}])
        this._burnEvent(data.token, data.nebAddr, value)
    }

    _burnEvent(token, addr, amount) {
        Event.Trigger('Link', {
            Status: true,
            Burn: {
                token: token,
                address: addr,
                value: amount
            }
        });
    }

    refund(token, ethAddr, nebAddr, amount, taxFee) {
        this._verifyFromAssetManager()

        if (new BigNumber(amount).lte(taxFee)) {
            throw new Error('insufficient amount to refund')
        }

        let refundId = this.linkContract.call('refund', token, ethAddr, nebAddr, amount, taxFee)

        let tokenContract = this._tokenContract(token)
        let taxAddr = this.config.tax
        amount = new BigNumber(amount).sub(taxFee).toString(10)
        tokenContract.call('mint', [{addr: nebAddr, value: amount}, {addr: taxAddr, value: taxFee}])
        this._refundEvent(token, ethAddr, nebAddr, amount, taxFee)
        return refundId
    }

    _refundEvent(token, from, to, amount, taxFee) {
        Event.Trigger('Link', {
            Status: true,
            Refund: {
                token: token,
                from: from,
                to: to,
                value: amount,
                taxFee: taxFee
            }
        });
    }

    getStakeData(key) {
        return this.linkContract.call('getStakeData', key)
    }

    getStakePageIndexes() {
        return this.linkContract.call('getStakePageIndexes')
    }

    getStakePageData(index) {
        return this.linkContract.call('getStakePageData', index)
    }

    getRefundData(key) {
        return this.linkContract.call('getRefundData', key)
    }

    getRefundPageIndexes() {
        return this.linkContract.call('getRefundPageIndexes')
    }

    getRefundPageData(index) {
        return this.linkContract.call('getRefundPageData', index)
    }
}


module.exports = LinkProxy
