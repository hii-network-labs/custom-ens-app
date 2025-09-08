# Hướng dẫn Test Domain Availability

## Vấn đề hiện tại
- Domain name rỗng khi thử đăng ký
- Hook không được gọi vì domain name rỗng
- Cần test domain availability với domain cụ thể

## Các bước test

### Bước 1: Nhập Domain Name
1. Nhập domain name vào form (ít nhất 3 ký tự)
2. Xem console logs để kiểm tra domain availability

### Bước 2: Sử dụng nút "Test Availability"
1. Nhập domain name
2. Nhấn nút "Test Availability" (màu xanh)
3. Xem kết quả direct contract call
4. So sánh với hook result

### Bước 3: Sử dụng nút "Test Random Domain"
1. Nhấn nút "Test Random Domain" (màu xanh lá)
2. Sẽ tạo domain ngẫu nhiên và test
3. Xem kết quả trong console và alert

### Bước 4: Sử dụng nút "Check Contract"
1. Nhấn nút "Check Contract" (màu tím)
2. Kiểm tra contract address và chain ID
3. Xem contract có code không

## Debug Information

### Console Logs cần kiểm tra:
```
=== DOMAIN AVAILABILITY HOOK ===
Domain name: [name]
Is enabled: true/false
Result: [result object]
Data: [data]
Is loading: true/false
Error: [error]
================================

=== COMPONENT DOMAIN AVAILABILITY ===
Domain name: [name]
Is available: [true/false/undefined]
Is loading: true/false
Is available type: [string/number/boolean]
=====================================
```

### Test Results:
```
Test domain: test1234567890
Test result: 0x0000000000000000000000000000000000000000000000000000000000000001
Test domain available: true
```

### Contract Info:
```
Contract Info:
Address: 0x1e7339b9e6dc09be0650a3163f367574679e7497
Code length: 12345
Chain ID: 0x1e
```

## Cách khắc phục

### 1. **Nếu domain name rỗng**
- Đảm bảo nhập domain name trước khi test
- Domain name phải có ít nhất 3 ký tự

### 2. **Nếu hook không hoạt động**
- Kiểm tra contract address có đúng không
- Kiểm tra chain ID có đúng không (0x1e cho Hii Network)

### 3. **Nếu function available không tồn tại**
- Contract có thể không có function `available`
- Cần kiểm tra contract documentation

### 4. **Nếu tất cả domain đều unavailable**
- Có thể contract logic khác
- Cần kiểm tra contract implementation

## Lệnh debug bổ sung

### Kiểm tra contract functions:
```javascript
// Mở DevTools và chạy:
const contractAddress = '0x1e7339b9e6dc09be0650a3163f367574679e7497'
console.log('Contract address:', contractAddress)

// Kiểm tra contract có code không
const code = await window.ethereum.request({
  method: 'eth_getCode',
  params: [contractAddress, 'latest']
})
console.log('Contract code length:', code.length)
```

### Test function available:
```javascript
// Test với domain cụ thể
const testDomain = 'test123'
const result = await window.ethereum.request({
  method: 'eth_call',
  params: [{
    to: contractAddress,
    data: '0x' + 'available(string)'.slice(0, 10) + 
          '0000000000000000000000000000000000000000000000000000000000000020' +
          '000000000000000000000000000000000000000000000000000000000000000' + testDomain.length.toString(16).padStart(64, '0') +
          Buffer.from(testDomain).toString('hex').padEnd(64, '0')
  }, 'latest']
})
console.log('Test result:', result)
```

## Thông tin cần cung cấp

Khi báo lỗi, vui lòng cung cấp:
1. **Domain name đang test**
2. **Console logs đầy đủ**
3. **Test Availability button result**
4. **Test Random Domain result**
5. **Check Contract result**
6. **Contract address và chain ID**

## Lưu ý quan trọng

- **Đảm bảo nhập domain name trước khi test**
- **Domain name phải có ít nhất 3 ký tự**
- **Kiểm tra contract address và chain ID**
- **Test với domain ngẫu nhiên để so sánh**
- **Function available có thể không tồn tại trong contract**

