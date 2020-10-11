/** Automatically generated code, please do not modify. */
const Link = require('./contracts/Link/online.js').testnet
const LinkMainnet = require('./contracts/Link/online.js').mainnet
const LinkProxy = require('./contracts/LinkProxy/online.js').testnet
const LinkProxyMainnet = require('./contracts/LinkProxy/online.js').mainnet
const MultiSig = require('./contracts/MultiSig/online.js').testnet
const MultiSigMainnet = require('./contracts/MultiSig/online.js').mainnet
const MultiSigNew = require('./contracts/MultiSigNew/online.js').testnet
const MultiSigNewMainnet = require('./contracts/MultiSigNew/online.js').mainnet
const USDToken = require('./contracts/USDToken/online.js').testnet
const USDTokenMainnet = require('./contracts/USDToken/online.js').mainnet
/** Automatically generated code; End. */

let isMainnet = false

if (isMainnet) {
    Link = require('./contracts/Link/online.js').mainnet
    LinkProxy = require('./contracts/LinkProxy/online.js').mainnet
    MultiSig = require('./contracts/MultiSig/online.js').mainnet
    USDToken = require('./contracts/USDToken/online.js').mainnet
}


const TestKeys = require('../lib/test_keys.js')
const ConfigRunner = require('../lib/config_runner.js')
const ConfigManager = require('../lib/config_manager.js')
const NebUtil = require('../lib/neb_util.js')
const TestUtils = require('./utils.js')

const callerAddr = TestKeys.caller.getAddressString()
console.log('deployer', TestKeys.deployer.getAddressString())
console.log('caller', callerAddr)
// return

class LinkTest {
    async deploy() {
        await MultiSig._deploy([callerAddr])
        await Link._deploy(ConfigManager.getOnlineContractAddress(MultiSig))
        await LinkProxy._deploy(ConfigManager.getOnlineContractAddress(MultiSig))
        await USDToken._deploy('nUSDT', 'nUSDT',6, ConfigManager.getOnlineContractAddress(MultiSig))
    }

    async setConfig() {
        let sysConfig = {
            config: {
                'multiSig': ConfigManager.getOnlineContractAddress(MultiSig),
                'link': ConfigManager.getOnlineContractAddress(Link),
                'linkProxy': ConfigManager.getOnlineContractAddress(LinkProxy),
                'assetManagers': [callerAddr],
                'dataManagers': [callerAddr],
                'tax': callerAddr,
                'tokens': {
                    'nUSDT': ConfigManager.getOnlineContractAddress(USDToken),
                }

            },
            contractList: {
                'link': ConfigManager.getOnlineContractAddress(Link),
                'linkProxy': ConfigManager.getOnlineContractAddress(LinkProxy),
                'nUSDT': ConfigManager.getOnlineContractAddress(USDToken),
            }
        }

        await MultiSig.setConfig(sysConfig)
        TestUtils.log("config", await MultiSig.getConfigTest())
    }

    async stake(ethAddr, value) {
        await USDToken._setAccount(TestKeys.otherKeys[0]).approve(ConfigManager.getOnlineContractAddress(LinkProxy), '0', value)
        await LinkProxy._setAccount(TestKeys.otherKeys[0]).stake('nUSDT', ethAddr, value)
    }

    async refund(ethAddr, value) {
        await LinkProxy.refund('nUSDT', ethAddr, TestKeys.otherKeys[0].getAddressString(), value)
    }
}

async function main() {
    let link = new LinkTest()
    await link.deploy()
    await link.setConfig()
    // TestUtils.log('config', await MultiSig.getConfigTest())
}

main()
