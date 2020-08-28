/** Local simulation environment code; Do not modify */
const neblocal = require('../../lib/neblocal')
const crypto = require('../../lib/crypto')
const BigNumber = require('bignumber.js')
const Blockchain = neblocal.Blockchain
const LocalContractStorage = neblocal.LocalContractStorage
const Event = neblocal.Event
/** Local simulation environment code; End. */


let Allowed = function (obj) {
    this._allowed = {};
    this.parse(obj);
};

Allowed.prototype = {
    toString: function () {
        return JSON.stringify(this._allowed);
    },

    parse: function (obj) {
        if (typeof obj != "undefined") {
            let data = JSON.parse(obj);
            for (let key in data) {
                this._allowed[key] = new BigNumber(data[key]);
            }
        }
    },

    get: function (key) {
        return this._allowed[key];
    },

    set: function (key, value) {
        this._allowed[key] = new BigNumber(value);
    }
};

function USDToken () {
    // You need to ensure that each contract has a different __contractName
    this.__contractName = "USDToken";

    LocalContractStorage.defineProperties(this, {
        _name: null,
        _symbol: null,
        _decimals: null,
        _totalSupply: {
            parse: function (value) {
                return new BigNumber(value);
            },
            stringify: function (o) {
                return o.toString(10);
            }
        },
        _config: null,
        _blacklist: null
    });

    LocalContractStorage.defineMapProperties(this, {
        "_balances": {
            parse: function (value) {
                return new BigNumber(value);
            },
            stringify: function (o) {
                return o.toString(10);
            }
        },
        "_allowed": {
            parse: function (value) {
                return new Allowed(value);
            },
            stringify: function (o) {
                return o.toString();
            }
        }
    });
}

USDToken.prototype = {
    init: function (name, symbol, decimals, multiSig) {
        this._name = name;
        this._symbol = symbol;
        this._decimals = decimals || 0;
        this._totalSupply = new BigNumber(0);
        this._config = {multiSig: multiSig};
        this._blacklist = [];
    },

    // Returns the name of the token
    name: function () {
        return this._name;
    },

    // Returns the symbol of the token
    symbol: function () {
        return this._symbol;
    },

    // Returns the number of decimals the token uses
    decimals: function () {
        return this._decimals;
    },

    totalSupply: function () {
        return this._totalSupply.toString(10);
    },

    balanceOf: function (owner) {
        this._verifyAddress(owner);

        let balance = this._balances.get(owner);
        if (balance instanceof BigNumber) {
            return balance.toString(10);
        } else {
            return "0";
        }
    },

    _verifyPermission: function () {
        if (this._config.multiSig !== Blockchain.transaction.from) {
            throw new Error("Permission Denied!");
        }
    },

    _verifyAddress: function (address) {
        if (Blockchain.verifyAddress(address) === 0) {
            throw new Error("Address format error, address=" + address);
        }
    },

    _verifyValue: function(value) {
        let bigVal = new BigNumber(value);
        if (bigVal.isNaN() || !bigVal.isFinite()) {
            throw new Error("Invalid value, value=" + value);
        }
        if (bigVal.isNegative()) {
            throw new Error("Value is negative, value=" + value);
        }
        if (!bigVal.isInteger()) {
            throw new Error("Value is not integer, value=" + value);
        }
        if (value !== bigVal.toString(10)) {
            throw new Error("Invalid value format.");
        }
    },

    _verifyBlacklist: function(addr) {
        if (this._blacklist.indexOf(addr) >= 0) {
            throw new Error("Address is not allowed for transaction.");
        }
    },

    _verifyAssetIssue: function() {
        if (this._config.linkProxy !== Blockchain.transaction.from) {
            throw new Error("Permission Denied for issue!");
        }
    },

    _verifyFromAssetManager() {
        if (this._config.assetManagers.indexOf(Blockchain.transaction.from) < 0) {
            throw new Error('No asset permissions.')
        }
    },

    setConfig: function(config) {
        this._verifyPermission();
        this._config = config;
    },

    getConfig: function () {
        return this._config;
    },

    setBlacklist: function(blacklist) {
        this._verifyPermission();

        for (let i = 0; i < blacklist.length; ++i) {
            this._verifyAddress(addrList[i]);
        }

        this._blacklist = blacklist;
    },

    getBlacklist: function() {
        return this._blacklist;
    },

    issue: function(data) {
        this._verifyAssetIssue();

        if (!(data instanceof Array)) {
            throw new Error("Issue data format error.")
        }

        let total = new BigNumber(0);
        for (let key in data) {
            let item = data[key];
            this._verifyAddress(item.addr);
            this._verifyValue(item.value);

            let balance = this._balances.get(item.addr) || new BigNumber(0);
            // balance + value
            total = total.plus(item.value);
            balance = balance.plus(item.value);
            this._balances.set(item.addr, balance);
        }
        this._totalSupply = this._totalSupply.plus(total);
        this._issueEvent(true, this._totalSupply, data);
    },

    _issueEvent: function (status, total, data) {
        Event.Trigger(this.name(), {
            Status: status,
            Issue: {
                total: total.toString(10),
                data: data
            }
        });
    },

    destory: function(data) {
        this._verifyAssetIssue();

        if (!(data instanceof Array)) {
            throw new Error("Destory data format error.")
        }

        let total = new BigNumber(0);
        for (let key in data) {
            let item = data[key];
            this._verifyAddress(item.addr);
            this._verifyValue(item.value);

            let balance = this._balances.get(item.addr) || new BigNumber(0);
            // balance - value
            if (balance.gte(item.value)) {
                total = total.plus(item.value);
                balance = balance.sub(item.value);
                this._balances.set(item.addr, balance);
            } else {
                throw new Error('destory failed with:' + item.addr);
            }
        }
        this._totalSupply = this._totalSupply.sub(total);
        this._destoryEvent(true, this._totalSupply, data);
    },

    _destoryEvent: function (status, total, data) {
        Event.Trigger(this.name(), {
            Status: status,
            Destory: {
                total: total.toString(10),
                data: data
            }
        });
    },

    transfer: function (to, value) {
        let from = Blockchain.transaction.from;
        this._transferValue(from, to, value);
    },

    _transferValue: function (from, to, value) {
        this._verifyBlacklist(from);
        this._verifyAddress(from);
        this._verifyAddress(to);
        this._verifyValue(value);

        value = new BigNumber(value);
        let balance = this._balances.get(from) || new BigNumber(0);

        if (balance.lt(value)) {
            throw new Error("transfer failed.");
        }

        this._balances.set(from, balance.sub(value));
        let toBalance = this._balances.get(to) || new BigNumber(0);
        this._balances.set(to, toBalance.add(value));

        this._transferEvent(true, from, to, value.toString(10));
    },

    transferFrom: function (from, to, value) {
        this._verifyBlacklist(Blockchain.transaction.from);

        let spender = Blockchain.transaction.from;
        let allowed = this._allowed.get(from) || new Allowed();
        let allowedValue = allowed.get(spender) || new BigNumber(0);

        if (allowedValue.gte(value)) {
            this._transferValue(from, to, value);

            // update allowed value
            allowed.set(spender, allowedValue.sub(value));
            this._allowed.set(from, allowed);
        } else {
            throw new Error("transfer allow failed.");
        }
    },

    _transferEvent: function (status, from, to, value) {
        Event.Trigger(this.name(), {
            Status: status,
            Transfer: {
                from: from,
                to: to,
                value: value
            }
        });
    },

    approve: function (spender, currentValue, value) {
        this._verifyAddress(spender);
        this._verifyValue(currentValue);
        this._verifyValue(value);

        let from = Blockchain.transaction.from;

        let oldValue = this.allowance(from, spender);
        if (oldValue != currentValue) {
            throw new Error("current approve value mistake.");
        }

        let balance = new BigNumber(this.balanceOf(from));
        value = new BigNumber(value);

        if (balance.lt(value)) {
            throw new Error("invalid value.");
        }

        let owned = this._allowed.get(from) || new Allowed();
        owned.set(spender, value);

        this._allowed.set(from, owned);

        this._approveEvent(true, from, spender, value.toString(10));
    },

    _approveEvent: function (status, from, spender, value) {
        Event.Trigger(this.name(), {
            Status: status,
            Approve: {
                owner: from,
                spender: spender,
                value: value
            }
        });
    },

    allowance: function (owner, spender) {
        this._verifyAddress(owner);
        this._verifyAddress(spender);

        let owned = this._allowed.get(owner);
        if (owned instanceof Allowed) {
            let spenderObj = owned.get(spender);
            if (typeof spenderObj != "undefined") {
                return spenderObj.toString(10);
            }
        }
        return "0";
    },

    withdraw: function(addr) {
        this._verifyPermission();
        this._verifyAddress(addr);

        let balance = Blockchain.getAccountState(Blockchain.transaction.to).balance;
        if (new BigNumber(balance).gt(0)) {
            let result = Blockchain.transfer(addr, balance);
            this._withdrawEvent(result, Blockchain.transaction.to, addr, balance);
            if (!result) {
                throw new Error("Withdraw failed.");
            }
        }
    },

    _withdrawEvent: function (status, from, to, value) {
        Event.Trigger(this.name(), {
            Status: status,
            Withdraw: {
                from: from,
                to: to,
                value: value
            }
        });
    }
};

module.exports = USDToken;