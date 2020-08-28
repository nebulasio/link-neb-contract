# LinkProxy

### 1. 绑定eth地址

```javascript
updateMappingAccount(ethAddr)
```

### 2. 查询绑定地址
```javascript
getMappingAccount(addr)
```

### 3. 向合约质押
```javascript
/**
 * 
 * @param {*} 
 * {
 *  'token':支持代币类型，当前为nUSD
 *  'ethAddr': 以太地址,不填为之前绑定地址，输入后覆盖之前地址，@optional
 *  'amount': 转账金额，转账前需保证，地址向合约approve足够的资金
 * }
 * @return {*} stakeId
 *
 * /
stake(token, ethAddr, amount)
```

### 4. 合约增发，后台调用
```javascript
/**
 * @param {*} 
 * 
 * {
 *  'token':支持代币类型，当前为nUSD
 *  'ethAddr': 以太地址,
 *  'nebAddr': 星云地址
 *  'amount': 转账金额，
 * }
 */
refund(token, ethAddr, nebAddr, amount)
```

### 5. 销毁跨链转账资金
```javascript
/**
 * @param {*}
 * {
 *  'stakeId': 质押ID，
 *  'tax': 跨链转账手续费
 * }
 */
destoryStake(stakeId, tax)
```

### 6. 查询质押记录
```javascript
getStakeData(stakeId)
```

### 7. 查询质押分页信息
```javascript
/**
 * @return {*} [{
 *   i:0, l:11
 * }, ... ]
*/
getStakePageIndexes()
```

### 8. 取消投票
```javascript
/**
 * @param {*} index
 * @return {*}
 * {
 * id: stakeId
 * token: token
 * ethAddr: eth addr
 * nebAddr: neb addr
 * amount: stake value
 * timestamp: stake time
 * }
 */
getStakePageData(index)
```

### 9. 查询转账记录
```javascript
getRefundData(refundId)
```

### 10. 查询分发分页信息
```javascript
/**
 * @return {*} [{
 *   i:0, l:11
 * }, ... ]
*/
getRefundPageIndexes()
```

### 11. 查询分发分数据
```javascript
/**
 * @param {*} index
 * @return {*}
 * {
 * id: stakeId
 * token: token
 * ethAddr: eth addr
 * nebAddr: neb addr
 * amount: stake value
 * timestamp: stake time
 * }
 */
getRefundPageData(index)
```