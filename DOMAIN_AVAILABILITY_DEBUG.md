# Debug Domain Availability Issue

## Vấn đề
Tất cả domain đều báo "❌ Domain đã được đăng ký" mặc dù có thể domain chưa được đăng ký.

## Nguyên nhân có thể

### 1. **ABI thiếu function `available`**
- ABI không có function `available`
- **Đã fix**: Thêm function `available` vào ABI

### 2. **Contract address không đúng**
- Contract address có thể không đúng
- **Kiểm tra**: `ENS_CONTRACTS.ETH_REGISTRAR_CONTROLLER`

### 3. **Function `available` không tồn tại**
- Contract có thể không có function `available`
- **Kiểm tra**: Contract có function này không

### 4. **Hook không hoạt động đúng**
- `useReadContract` có thể có vấn đề
- **Kiểm tra**: Debug logs

## Debug Information

### Hook Debug Logs:
```
=== DOMAIN AVAILABILITY HOOK ===
Domain name: [name]
Is enabled: true/false
Result: [result object]
Data: [data]
Is loading: true/false
Error: [error]
================================
```

### Component Debug Logs:
```
=== COMPONENT DOMAIN AVAILABILITY ===
Domain name: [name]
Is available: [true/false/undefined]
Is loading: true/false
Is available type: [string/number/boolean]
Is available === true: true/false
Is available === false: true/false
=====================================
```

## Cách debug

### Bước 1: Kiểm tra Console Logs
1. Mở DevTools (F12)
2. Chuyển sang tab Console
3. Nhập domain name
4. Xem debug logs

### Bước 2: Sử dụng nút "Test Availability"
1. Nhập domain name
2. Nhấn nút "Test Availability"
3. Xem kết quả direct contract call
4. So sánh với hook result

### Bước 3: Kiểm tra Contract
```javascript
// Mở DevTools và chạy:
const contractAddress = '0x1e7339b9e6dc09be0650a3163f367574679e7497'
console.log('Contract address:', contractAddress)

// Kiểm tra contract có function available không
const code = await window.ethereum.request({
  method: 'eth_getCode',
  params: [contractAddress, 'latest']
})
console.log('Contract code length:', code.length)
```

## Giải pháp thử nghiệm

### 1. **Kiểm tra ABI**
```javascript
// Kiểm tra ABI có function available không
const abi = ETH_REGISTRAR_CONTROLLER_ABI
const hasAvailable = abi.some(item => item.name === 'available')
console.log('ABI has available function:', hasAvailable)
```

### 2. **Direct Contract Call**
```javascript
// Gọi trực tiếp contract
const result = await window.ethereum.request({
  method: 'eth_call',
  params: [{
    to: contractAddress,
    data: '0x' + 'available(string)'.slice(0, 10) + 
          '0000000000000000000000000000000000000000000000000000000000000020' +
          '000000000000000000000000000000000000000000000000000000000000000' + domainName.length.toString(16).padStart(64, '0') +
          Buffer.from(domainName).toString('hex').padEnd(64, '0')
  }, 'latest']
})
console.log('Direct call result:', result)
```

### 3. **Thử với Domain khác**
```javascript
// Thử với domain ngẫu nhiên
const testDomain = 'test' + Date.now()
console.log('Testing with domain:', testDomain)
```

### 4. **Kiểm tra Network**
```javascript
// Kiểm tra network có đúng không
const chainId = await window.ethereum.request({
  method: 'eth_chainId'
})
console.log('Chain ID:', chainId)
// Hii Network: 0x1e (30)
```

## Thông tin cần cung cấp

Khi báo lỗi, vui lòng cung cấp:
1. **Domain name đang test**
2. **Hook debug logs**
3. **Component debug logs**
4. **Test Availability button result**
5. **Contract address**
6. **Network chain ID**

## Lưu ý quan trọng

- **Function `available` có thể không tồn tại trong contract**
- **Có thể cần sử dụng function khác để kiểm tra availability**
- **Direct contract call sẽ cho kết quả chính xác hơn**
- **Kiểm tra contract documentation để biết function đúng**

