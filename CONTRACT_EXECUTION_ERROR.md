# Khắc phục lỗi "Error occurred during contract execution"

## Vấn đề
Lỗi "error occurred during contract execution" có nghĩa là:
- ✅ Transaction được gửi thành công đến blockchain
- ❌ Contract execution bị fail
- ❌ Gas đã được tiêu thụ nhưng không thành công

## Nguyên nhân chính

### 1. **Domain đã được đăng ký**
- Domain có thể đã được đăng ký bởi người khác
- **Giải pháp**: Kiểm tra domain availability trước khi đăng ký

### 2. **Commitment không hợp lệ**
- Commitment đã hết hạn
- Commitment không đúng format
- **Giải pháp**: Tạo commitment mới

### 3. **Parameters không đúng**
- Price không đúng
- Duration không hợp lệ
- Owner address không đúng
- **Giải pháp**: Kiểm tra parameters

### 4. **Contract state issue**
- Contract có thể có vấn đề
- **Giải pháp**: Kiểm tra contract status

## Cách khắc phục

### Bước 1: Kiểm tra Domain Availability
```javascript
// Kiểm tra domain có available không
const available = await contract.available('domainname')
console.log('Domain available:', available)
```

### Bước 2: Kiểm tra Commitment
```javascript
// Kiểm tra commitment có hợp lệ không
const commitmentValid = await contract.commitments(commitmentHash)
console.log('Commitment valid:', commitmentValid)
```

### Bước 3: Kiểm tra Parameters
```javascript
// Kiểm tra price có đúng không
const price = await contract.rentPrice('domainname', duration)
console.log('Correct price:', price.toString())
```

### Bước 4: Tạo Commitment mới
1. Reset form về bước 1
2. Tạo commitment mới
3. Chờ đủ thời gian
4. Thử đăng ký

## Debug Information

### Domain Availability Check:
```
=== DOMAIN AVAILABILITY CHECK ===
Domain name: [name]
Full domain: [name.hii]
Owner address: [owner]
Duration: [duration] years
Price: [price]
Checking availability...
==================================
```

### Commitment Check:
```
=== COMMITMENT CHECK ===
Current commitment hash: [hash]
Name: [name]
Owner: [owner]
Duration: [duration]
Secret: [secret]
Secret hash: [secret hash]
Commitment timestamp: [timestamp]
Checking commitment validity...
========================
```

## Các bước kiểm tra

### 1. **Kiểm tra Domain**
- Domain có available không?
- Domain có đúng format không?
- Domain có quá ngắn/dài không?

### 2. **Kiểm tra Commitment**
- Commitment có hợp lệ không?
- Commitment có hết hạn không?
- Commitment có đúng format không?

### 3. **Kiểm tra Parameters**
- Price có đúng không?
- Duration có hợp lệ không?
- Owner address có đúng không?

### 4. **Kiểm tra Timing**
- Đã chờ đủ thời gian sau commit chưa?
- Commitment có quá cũ không?

## Giải pháp thử nghiệm

### 1. **Thử với Domain khác**
```javascript
// Thử đăng ký domain khác
const testDomain = 'test' + Date.now()
console.log('Testing with domain:', testDomain)
```

### 2. **Tăng Wait Time**
```javascript
// Tăng thời gian chờ
setWaitTime(120) // 120 giây thay vì 90
```

### 3. **Kiểm tra Contract State**
```javascript
// Kiểm tra contract có hoạt động không
const contractAddress = ENS_CONTRACTS.ETH_REGISTRAR_CONTROLLER
console.log('Contract address:', contractAddress)
```

### 4. **Clear và Retry**
1. Clear browser cache
2. Disconnect và reconnect MetaMask
3. Thử lại với domain mới

## Lệnh debug bổ sung

### Kiểm tra domain trên explorer:
```javascript
// Mở DevTools và chạy:
const domain = 'yourdomainname'
console.log('Check domain on explorer:', `https://explorer.hii.network/ens/${domain}.hii`)
```

### Kiểm tra contract:
```javascript
const contract = new ethers.Contract(ENS_CONTRACTS.ETH_REGISTRAR_CONTROLLER, ABI, provider)
const owner = await contract.owner()
console.log('Contract owner:', owner)
```

### Kiểm tra price:
```javascript
const price = await contract.rentPrice('domainname', 31536000) // 1 year
console.log('Price for 1 year:', ethers.formatEther(price), 'HII')
```

## Thông tin cần cung cấp

Khi báo lỗi, vui lòng cung cấp:
1. **Domain name muốn đăng ký**
2. **Commitment hash**
3. **Transaction hash** (từ explorer)
4. **Console logs** (Domain Availability và Commitment Check)
5. **MetaMask transaction details**

## Lưu ý quan trọng

- **Contract execution error không phải do balance**
- **Gas đã được tiêu thụ dù transaction fail**
- **Cần kiểm tra domain availability trước**
- **Commitment có thể hết hạn**
- **Thử với domain khác nếu cần**

