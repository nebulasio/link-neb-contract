/** Local simulation environment code; Do not modify */
const neblocal = require('../../lib/neblocal')
const crypto = require('../../lib/crypto')
const BigNumber = require('bignumber.js')
const Blockchain = neblocal.Blockchain
const LocalContractStorage = neblocal.LocalContractStorage
const Event = neblocal.Event
/** Local simulation environment code; End. */

class PageData {

    constructor(storage, key, pageSize) {
        this._storage = storage
        this._key = key
        this._pageIndexes = null
        if (!pageSize) {
            pageSize = 200
        }
        this._pageSize = pageSize
    }

    getPageIndexes() {
        if (!this._pageIndexes) {
            this._pageIndexes = this._storage.get(this._indexesKey())
        }
        if (!this._pageIndexes) {
            this._pageIndexes = []
        }
        return this._pageIndexes
    }

    getPageData(index) {
        let r = this._storage.get(this._dataKey(index))
        if (!r) {
            r = []
        }
        return r
    }

    addAll(data) {
        let indexes = this.getPageIndexes()
        let tempPageData = null
        for (let i = 0; i < data.length; ++i) {
            let obj = data[i]
            let p = null
            for (let i = 0; i < indexes.length; ++i) {
                let index = indexes[i]
                if (index.l < this._pageSize) {
                    p = index
                    break
                }
            }
            if (p == null) {
                let i = 0
                if (indexes.length > 0) {
                    i = indexes[indexes.length - 1].i + 1
                }
                p = { i: i, l: 0 }
                indexes.push(p)
            }

            if (tempPageData != null && tempPageData.index !== p.i) {
                this._storage.put(this._dataKey(tempPageData.index), tempPageData.data)
                tempPageData = null
            }
            if (!tempPageData) {
                tempPageData = { index: p.i, data: this.getPageData(p.i) }
            }
            let d = tempPageData.data
            d.push(obj)
            p.l += 1
        }
        if (tempPageData) {
            this._storage.put(this._dataKey(tempPageData.index), tempPageData.data)
        }
        this._saveIndexes()
    }

    add(obj) {
        let indexes = this.getPageIndexes()
        let p = null
        for (let i = 0; i < indexes.length; ++i) {
            let index = indexes[i]
            if (index.l < this._pageSize) {
                p = index
                break
            }
        }

        if (p == null) {
            let i = 0
            if (indexes.length > 0) {
                i = indexes[indexes.length - 1].i + 1
            }
            p = { i: i, l: 0 }
            this._addIndex(p)
        }

        let d = this.getPageData(p.i)
        d.push(obj)
        p.l += 1
        this._saveIndexes()
        this._storage.put(this._dataKey(p.i), d)
    }

    del(ele) {
        let indexes = this.getPageIndexes()
        if (indexes) {
            for (let i = 0; i < indexes.length; ++i) {
                let index = indexes[i]
                let ds = this.getPageData(index.i)
                if (ds) {
                    for (let j = 0; j < ds.length; ++j) {
                        if (ele === ds[j]) {
                            ds.splice(j, 1)
                            index.l -= 1
                            this._storage.put(this._dataKey(index.i), ds)
                            this._storage.put(this._indexesKey(), indexes)
                            return true
                        }
                    }
                }
            }
        }
        return false
    }

    delAll(eles) {
        let indexes = this.getPageIndexes()
        if (indexes.length === 0) {
            return
        }
        let cachePages = {}
        for (let k = 0; k < eles.length; ++k) {
            let ele = eles[k]
            for (let i = 0; i < indexes.length; ++i) {
                let index = indexes[i]
                let strIndex = "" + index.i
                let p = cachePages[strIndex]
                if (!p) {
                    p = { changed: false, data: this.getPageData(index.i) }
                    cachePages[strIndex] = p
                }
                let newData = []
                for (let j = 0; j < p.data.length; ++j) {
                    if (ele !== p.data[j]) {
                        newData.push(p.data[j])
                    }
                }
                if (newData.length !== p.data.length) {
                    p.changed = true
                    p.data = newData
                    index.l = newData.length
                }
            }
        }
        for (let index in cachePages) {
            let p = cachePages[index]
            if (p.changed) {
                this._savePageData(index, p.data)
            }
        }
        this._saveIndexes()
    }

    _indexesKey() {
        return "pis_" + this._key
    }

    _dataKey(index) {
        return "pd_" + this._key + "_" + index
    }

    _lastIndex() {
        let indexes = this.getPageIndexes()
        if (indexes.length > 0) {
            return indexes[indexes.length - 1]
        }
        return null
    }

    _addIndex(index) {
        this.getPageIndexes().push(index)
        this._saveIndexes()
    }

    _saveIndexes() {
        this._storage.put(this._indexesKey(), this.getPageIndexes())
    }

    _savePageData(index, data) {
        this._storage.put(this._dataKey(index), data)
    }
}

class Utils {

    static getNotNullArray(storage, key) {
        let r = storage.get(key)
        if (!r) {
            r = []
        }
        return r
    }

    static getValue(storage, storageKey, obj, key, defaultValue) {
        if (Utils.isNull(obj[key])) {
            let v = storage.get(storageKey)
            obj[key] = Utils.isNull(v) ? defaultValue : v
        }
        return obj[key]
    }

    static setValue(storage, storageKey, obj, key, value) {
        storage.set(storageKey, value)
        obj[key] = value
    }

    static isNull(o) {
        return typeof o === 'undefined' || o == null
    }

    static verifyBool(o) {
        if (typeof o !== 'boolean') {
            throw new Error(`${o} is not a boolean type`)
        }
    }

    static verifyAddress(address) {
        if (Blockchain.verifyAddress(address) === 0) {
            throw new Error(`Not a valid address: ${address}`)
        }
    }
}

class StateObj {
    constructor(storage, stateKey) {
        this.storage = storage
        this._stateKey = stateKey
    }

    getState(key, defaultValue) {
        if (Utils.isNull(defaultValue)) {
            defaultValue = null
        }
        return Utils.getValue(this.storage, `${this._stateKey}_${key}`, this, `_sv_${key}`, defaultValue)
    }

    setState(key, value) {
        Utils.setValue(this.storage, `${this._stateKey}_${key}`, this, `_sv_${key}`, value)
    }
}

class Data extends StateObj {
    constructor(storage, key) {
        super(storage, key)
        this._pages = new PageData(storage, key, 200)
    }

    _genKey(key) {
        let dkey = this._stateKey + '_k_' + key
        return dkey
    }

    setData(key, value) {
        let data = this.getData(key)
        if (!data) {
            this._pages.add(key)
        }
        this.setState(this._genKey(key), value)
    }

    getData(key) {
        if (!this._cache) {
            this._cache = {}
        }
        if ((typeof this._cache[key]) === 'undefined') {
            this._cache[key] = this.getState(this._genKey(key))
        }
        return this._cache[key]
    }

    getPageIndexes() {
        return this._pages.getPageIndexes()
    }

    getPageData(index) {
        let data = {}
        let keys = this._pages.getPageData(index)
        for (let key of keys) {
            data[key] = this.getData(key)
        }
        return data
    }
}

class IdGenerator {

    static init(storage) {
        IdGenerator.storage = storage
        IdGenerator.key = '_id_gen_key'
    }

    static newId() {
        if (!IdGenerator._id) {
            IdGenerator._id = IdGenerator.storage.get(IdGenerator.key)
            if (!IdGenerator._id) {
                IdGenerator._id = 0
            }
        }
        IdGenerator._id += 1
        IdGenerator.storage.set(IdGenerator.key, IdGenerator._id)
        return '_id_' + IdGenerator._id
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

    set config(config) {
        this.__config = config
        this._config = config
    }

    init(multiSig) {
        this._verifyAddress(multiSig)
        this.config = {
            multiSig: multiSig
        }
    }

    setConfig(config) {
        this._verifyFromMultiSig()
        this.config = config
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

    _verifyFromLinkProxy() {
        if (this.config.linkProxy !== Blockchain.transaction.from) {
            throw new Error('No permissions.')
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
}

class Link extends BaseContract {
    constructor() {
        super('Link')
        LocalContractStorage.defineMapProperty(this, '_storage', null)
        IdGenerator.init(this._storage)
        this._accounts = new Data(this._storage, 'account')
        this._stakes = new Data(this._storage, 'stake')
        this._refunds = new Data(this._storage, 'refund')
    }

    accept() {
        throw new Error('do not accept transfers.')
    }

    updateMappingAccount(addr, ethAddr) {
        this._verifyFromLinkProxy()
        this._verifyEthAddress(ethAddr)
        this._accounts.setData(addr, ethAddr)
    }

    getMappingAccount(addr) {
        return this._accounts.getData(addr)
    }

    stake(token, addr , ethAddr, amount) {
        if (Utils.isNull(ethAddr)) {
            ethAddr = this.getMappingAccount(ethAddr)
        } else {
            this.updateMappingAccount(addr, ethAddr)
        }
        if (Utils.isNull(ethAddr)) {
            throw new Error('eth address is invalid.')
        }

        let id = IdGenerator.newId()
        let data = {
            id: id,
            token: token,
            nebAddr: addr,
            ethAddr: ethAddr,
            amount: amount,
            timestamp: Blockchain.block.timestamp
        }
        this._stakes.setData(id, data)

        return id
    }

    refund(token, ethAddr, nebAddr, amount) {
        this._verifyFromLinkProxy()
        this._verifyEthAddress(ethAddr)

        let id = IdGenerator.newId()
        let data = {
            id: id,
            token: token,
            nebAddr: nebAddr,
            ethAddr: ethAddr,
            amount: amount,
            timestamp: Blockchain.block.timestamp
        }
        this._refunds.setData(id, data)

        return id
    }

    getMappingAccountPageIndexes() {
        return this._accounts.getPageIndexes()
    }

    getMappingAccountPageData(index) {
        return this._accounts.getPageData(index)
    }

    getStakeData(key) {
        return this._stakes.getData(key)
    }

    getStakePageIndexes() {
        return this._stakes.getPageIndexes()
    }

    getStakePageData(index) {
        return this._stakes.getPageData(index)
    }

    getRefundData(key) {
        return this._refunds.getData(key)
    }

    getRefundPageIndexes() {
        return this._refunds.getPageIndexes()
    }

    getRefundPageData(index) {
        return this._refunds.getPageData(index)
    }
}


module.exports = Link
