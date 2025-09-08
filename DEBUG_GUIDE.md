# Hướng dẫn Debug chi tiết

## Vấn đề hiện tại
- Balance check pass: ✅ Có đủ tiền
- Nhưng vẫn báo lỗi "Số dư không đủ"

## Debug Logs cần kiểm tra

### 1. Balance Check Logs
```
=== DEBUG BALANCE CHECK ===
Skip Balance Check: false
Balance: {value: '272977197014236654030', formatted: '272.977197 HII'}
Price: {value: '3125000000003490', formatted: '0.003125 HII'}
Gas Estimate: {gas: '200000', gasPrice: '10000000000', estimatedCost: '2000000000000000', formatted: '0.002000 HII'}
Total Cost: {value: '5125000000003490', formatted: '0.005125 HII'}
Balance Check: {hasEnough: true, difference: '272.972072 HII'}
==========================
```

### 2. Balance Check Pass Logs
```
=== BALANCE CHECK PASSED ===
Balance value: 272977197014236654030
Total cost: 5125000000003490
Balance >= TotalCost: true
Proceeding with transaction...
============================
```

### 3. Write Register Logs
```
=== CALLING WRITE REGISTER ===
Contract address: 0x1e7339b9e6dc09be0650a3163f367574679e7497
Function name: register
Value: 3125000000003490
Gas: 200000
=============================
=== WRITE REGISTER CALLED SUCCESSFULLY ===
```

### 4. Transaction Error Logs (nếu có)
```
=== TRANSACTION ERROR ===
Error message: [error message here]
Full error: [full error object]
========================
```

## Các bước debug

### Bước 1: Kiểm tra Console Logs
1. Mở DevTools (F12)
2. Chuyển sang tab Console
3. Thực hiện đăng ký domain
4. Kiểm tra tất cả logs trên

### Bước 2: Kiểm tra Network Tab
1. Chuyển sang tab Network
2. Lọc theo "Fetch/XHR"
3. Tìm các request đến RPC
4. Kiểm tra response

### Bước 3: Kiểm tra MetaMask
1. Mở MetaMask
2. Kiểm tra transaction history
3. Xem có transaction nào pending/failed không

## Các nguyên nhân có thể

### 1. **Gas Limit quá thấp**
- Hiện tại: 200,000 gas
- Thử tăng lên: 300,000 gas

### 2. **Commitment hết hạn**
- Commitment chỉ có hiệu lực trong 60 giây
- Kiểm tra thời gian chờ

### 3. **Nonce conflict**
- Có transaction pending khác
- Kiểm tra MetaMask

### 4. **Contract state**
- Domain đã được đăng ký
- Commitment không hợp lệ

### 5. **RPC issues**
- RPC node không sync
- Network congestion

## Cách khắc phục

### 1. **Tăng Gas Limit**
```javascript
const gasEstimate = BigInt(300000) // Tăng lên 300k
```

### 2. **Kiểm tra Commitment**
```javascript
// Kiểm tra commitment có hợp lệ không
const commitment = keccak256(encodePacked(...))
console.log('Expected commitment:', commitment)
console.log('Current commitment:', commitmentHash)
```

### 3. **Reset và thử lại**
1. Reset form về bước 1
2. Tạo commitment mới
3. Chờ đủ 60 giây
4. Thử đăng ký

### 4. **Kiểm tra MetaMask**
1. Clear pending transactions
2. Reset account
3. Thử lại

## Lệnh debug bổ sung

### Kiểm tra domain availability:
```javascript
// Kiểm tra domain có available không
const available = await contract.read.available(['lalala'])
console.log('Domain available:', available)
```

### Kiểm tra commitment:
```javascript
// Kiểm tra commitment có hợp lệ không
const commitmentValid = await contract.read.commitments([commitmentHash])
console.log('Commitment valid:', commitmentValid)
```

### Kiểm tra gas estimate:
```javascript
// Ước tính gas thực tế
const gasEstimate = await contract.estimateGas.register([...args])
console.log('Actual gas estimate:', gasEstimate.toString())
```

## Thông tin cần cung cấp khi báo lỗi

1. **Console logs đầy đủ**
2. **Network tab screenshots**
3. **MetaMask transaction history**
4. **Domain name muốn đăng ký**
5. **Wallet address**
6. **Thời gian xảy ra lỗi**

