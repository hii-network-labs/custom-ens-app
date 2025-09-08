# Debug Transaction Failure

## Vấn đề hiện tại
- ✅ Wallet connected: `0xb769BEFa05c7D9B08062630E351e865d3F49c56D`
- ✅ Balance sufficient: `272975760694236654030` (272.975 HII)
- ✅ Not zero address
- ❌ Transaction still fails with "insufficient funds"

## Nguyên nhân có thể

### 1. **Gas Limit quá thấp**
- Hiện tại: 300,000 gas
- ENS registration có thể cần nhiều gas hơn
- **Giải pháp**: Tăng gas limit lên 500,000

### 2. **Commitment hết hạn**
- Commitment chỉ có hiệu lực trong thời gian nhất định
- Có thể cần chờ lâu hơn 90 giây
- **Giải pháp**: Tăng wait time lên 120 giây

### 3. **Domain đã được đăng ký**
- Domain có thể đã được đăng ký bởi người khác
- **Giải pháp**: Kiểm tra domain availability

### 4. **Nonce conflict**
- Có transaction pending khác
- **Giải pháp**: Clear pending transactions

### 5. **Contract state**
- Contract có thể có vấn đề
- **Giải pháp**: Kiểm tra contract status

## Debug Logs cần kiểm tra

### 1. Transaction Error Logs
```
=== TRANSACTION ERROR DETAILED ===
Error message: [error message here]
Full error object: [full error object]
Error name: [error name]
Error code: [error code]
Error details: [error details]
Error cause: [error cause]
Error stack: [error stack]
==================================
```

### 2. Commitment Check Logs
```
=== COMMITMENT CHECK ===
Current commitment hash: [hash]
Name: [domain name]
Owner: [owner address]
Duration: [duration]
Secret: [secret]
Secret hash: [secret hash]
Commitment timestamp: [timestamp]
========================
```

### 3. Domain Availability Logs
```
=== DOMAIN AVAILABILITY CHECK ===
Domain name: [name]
Full domain: [name.hii]
Owner address: [owner]
Duration: [duration] years
Price: [price]
==================================
```

### 4. Write Register Logs
```
=== CALLING WRITE REGISTER ===
Contract address: [contract address]
Function name: register
Value: [value]
Gas: [gas]
Current timestamp: [timestamp]
Commitment age: [available/not available]
==============================
```

## Các bước debug

### Bước 1: Kiểm tra Transaction Error
1. Thực hiện đăng ký domain
2. Khi gặp lỗi, kiểm tra console logs
3. Tìm "TRANSACTION ERROR DETAILED"
4. Xem error message và details

### Bước 2: Kiểm tra Commitment
1. Xem "COMMITMENT CHECK" logs
2. Kiểm tra commitment hash có hợp lệ không
3. Kiểm tra timestamp

### Bước 3: Kiểm tra Domain
1. Xem "DOMAIN AVAILABILITY CHECK" logs
2. Kiểm tra domain có available không
3. Kiểm tra price có đúng không

### Bước 4: Kiểm tra Gas
1. Xem "CALLING WRITE REGISTER" logs
2. Kiểm tra gas limit có đủ không
3. Kiểm tra value có đúng không

## Giải pháp thử nghiệm

### 1. **Tăng Gas Limit**
```javascript
const gasEstimate = BigInt(500000) // Tăng lên 500k
```

### 2. **Tăng Wait Time**
```javascript
setWaitTime(120) // Tăng lên 120 giây
```

### 3. **Kiểm tra Domain Availability**
```javascript
// Kiểm tra domain có available không
const available = await contract.read.available(['domainname'])
console.log('Domain available:', available)
```

### 4. **Clear Pending Transactions**
1. Mở MetaMask
2. Kiểm tra pending transactions
3. Clear nếu có

### 5. **Thử với Domain khác**
1. Thử đăng ký domain khác
2. Xem có lỗi tương tự không

## Lệnh debug bổ sung

### Kiểm tra domain availability:
```javascript
// Mở DevTools và chạy:
const contract = new ethers.Contract(ENS_CONTRACTS.ETH_REGISTRAR_CONTROLLER, ABI, provider)
const available = await contract.available('domainname')
console.log('Domain available:', available)
```

### Kiểm tra commitment:
```javascript
const commitmentValid = await contract.commitments(commitmentHash)
console.log('Commitment valid:', commitmentValid)
```

### Kiểm tra gas estimate:
```javascript
const gasEstimate = await contract.estimateGas.register([...args])
console.log('Actual gas estimate:', gasEstimate.toString())
```

## Thông tin cần cung cấp

Khi báo lỗi, vui lòng cung cấp:
1. **Transaction Error logs đầy đủ**
2. **Commitment Check logs**
3. **Domain Availability logs**
4. **Write Register logs**
5. **MetaMask transaction history**
6. **Domain name muốn đăng ký**

## Lưu ý quan trọng

- **Transaction failure không có nghĩa là balance không đủ**
- **Có thể do gas limit, commitment, hoặc contract state**
- **Debug logs sẽ giúp xác định nguyên nhân chính xác**
- **Thử với gas limit cao hơn nếu cần**

