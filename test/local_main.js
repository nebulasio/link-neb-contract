/** Automatically generated code, please do not modify. */
const Link = require('./contracts/Link/local.js')
const LinkProxy = require('./contracts/LinkProxy/local.js')
const MultiSig = require('./contracts/MultiSig/local.js')
const MultiSigNew = require('./contracts/MultiSigNew/local.js')
const USDToken = require('./contracts/USDToken/local.js')
/** Automatically generated code; End. */

const TestKeys = require('../lib/test_keys.js')
const LocalContext = require('../lib/neblocal.js').LocalContext
const ConfigRunner = require('../lib/config_runner.js')
const { e } = require('../lib/logger.js')

const TestUtils = require('./utils.js')

const callerAddr = TestKeys.caller.getAddressString()

// 清空模拟环境数据
LocalContext.clearData()

class LinkTest {
    deploy() {
        MultiSig._deploy([callerAddr])
        Link._deploy(LocalContext.getContractAddress(MultiSig))
        LinkProxy._deploy(LocalContext.getContractAddress(MultiSig))
        USDToken._deploy('nUSDT', 'nUSDT',6, LocalContext.getContractAddress(MultiSig))
    }

    setConfig() {
        let sysConfig = {
            config: {
                'multiSig': LocalContext.getContractAddress(MultiSig),
                'link': LocalContext.getContractAddress(Link),
                'linkProxy': LocalContext.getContractAddress(LinkProxy),
                'assetManagers': [callerAddr],
                'dataManagers': [callerAddr],
                'tax': callerAddr,
                'tokens': {
                    'nUSDT': LocalContext.getContractAddress(USDToken),
                }

            },
            contractList: {
                'link': LocalContext.getContractAddress(Link),
                'linkProxy': LocalContext.getContractAddress(LinkProxy),
                'nUSDT': LocalContext.getContractAddress(USDToken),
            }
        }

        MultiSig.setConfig(sysConfig)
    }

    stake(ethAddr, value) {
        USDToken._setAccount(TestKeys.otherKeys[0]).approve(LocalContext.getContractAddress(LinkProxy), '0', value)
        LinkProxy._setAccount(TestKeys.otherKeys[0]).stake('nUSDT', ethAddr, value)
        TestUtils.log('addr balance', USDToken.balanceOf(TestKeys.otherKeys[0].getAddressString()))
        TestUtils.log('contract balance', USDToken.balanceOf(LocalContext.getContractAddress(LinkProxy)))
    }

    refund(ethAddr, value) {
        LinkProxy.refund('nUSDT', ethAddr, TestKeys.otherKeys[0].getAddressString(), value, '0')
        TestUtils.log('balance', USDToken.balanceOf(TestKeys.otherKeys[0].getAddressString()))
    }
}


async function main() {
    LocalContext.clearData()
    LocalContext.transfer(null, TestKeys.caller.getAddressString(), TestUtils.nas('10000000'))

    let eth = '0xd7ccc323edc3b6c59dad4d8cc9ce9c4631e03db0'
    let value = '100000'
    let test = new LinkTest()
    test.deploy()
    test.setConfig()
    test.refund(eth, value)
    test.stake(eth, value)
}

main()
