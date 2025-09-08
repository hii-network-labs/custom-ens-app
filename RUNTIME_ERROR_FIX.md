# Khắc phục lỗi Runtime Error

## Vấn đề đã được fix

### Lỗi: `ReferenceError: owner is not defined`
- **Nguyên nhân**: Trong dependency array của `useCallback`, đã thêm `owner` nhưng `owner` là parameter của function, không phải variable trong scope
- **Đã fix**: Loại bỏ `owner` khỏi dependency array

## Các lỗi runtime khác có thể gặp

### 1. **Lỗi undefined/null variables**
```javascript
// ❌ Sai - có thể gây lỗi
const { address } = useAccount()
console.log(address.value) // Lỗi nếu address là null

// ✅ Đúng - kiểm tra trước khi sử dụng
const { address } = useAccount()
if (address) {
  console.log(address.value)
}
```

### 2. **Lỗi dependency array**
```javascript
// ❌ Sai - thêm biến không tồn tại
}, [writeCommit, owner, isConnected, account])

// ✅ Đúng - chỉ thêm biến có trong scope
}, [writeCommit, isConnected, account])
```

### 3. **Lỗi async/await**
```javascript
// ❌ Sai - không handle lỗi
const result = await someFunction()

// ✅ Đúng - handle lỗi
try {
  const result = await someFunction()
} catch (error) {
  console.error('Error:', error)
}
```

## Cách debug lỗi runtime

### 1. **Kiểm tra Console**
- Mở DevTools (F12)
- Chuyển sang tab Console
- Tìm lỗi màu đỏ

### 2. **Kiểm tra Network**
- Chuyển sang tab Network
- Tìm request failed
- Kiểm tra response

### 3. **Kiểm tra Sources**
- Chuyển sang tab Sources
- Đặt breakpoint tại dòng lỗi
- Step through code

## Các biện pháp phòng ngừa

### 1. **Kiểm tra null/undefined**
```javascript
// Luôn kiểm tra trước khi sử dụng
if (address && isConnected) {
  // Sử dụng address
}
```

### 2. **Sử dụng optional chaining**
```javascript
// Thay vì
console.log(balance.value)

// Sử dụng
console.log(balance?.value)
```

### 3. **Sử dụng default values**
```javascript
// Thay vì
const { address } = useAccount()

// Sử dụng
const { address = null } = useAccount()
```

### 4. **Kiểm tra dependency array**
```javascript
// Luôn kiểm tra các biến trong dependency array
useCallback(() => {
  // function body
}, [/* chỉ thêm biến có trong scope */])
```

## Debug logs hiện tại

### Account Debug:
```
=== ACCOUNT DEBUG ===
Account address: 0x...  ✅ Real address
Is connected: true      ✅ Connected
Connection status: connected  ✅ Connected
Balance: 272977197014236654030  ✅ Has balance
Is zero address: false  ✅ Not zero address
Account is null: false  ✅ Not null
Account is undefined: false  ✅ Not undefined
=====================
```

### Component Debug:
```
=== COMPONENT ACCOUNT DEBUG ===
Address: 0x...  ✅ Real address
Is connected: true  ✅ Connected
Status: connected  ✅ Connected
Balance: 272977197014236654030  ✅ Has balance
Is zero address: false  ✅ Not zero address
Address is null: false  ✅ Not null
Address is undefined: false  ✅ Not undefined
================================
```

## Cách khắc phục nhanh

### 1. **Refresh trang**
- Nhấn F5 để refresh
- Hoặc nhấn nút "Thử lại"

### 2. **Clear cache**
- Clear browser cache
- Restart browser

### 3. **Check MetaMask**
- Đảm bảo MetaMask đã kết nối
- Kiểm tra network đúng

### 4. **Check console logs**
- Xem debug logs
- Tìm lỗi cụ thể

## Thông tin cần cung cấp khi báo lỗi

1. **Error message đầy đủ**
2. **Stack trace**
3. **Console logs**
4. **Browser version**
5. **MetaMask version**
6. **Network đang sử dụng**

## Lưu ý quan trọng

- **Luôn kiểm tra null/undefined trước khi sử dụng**
- **Sử dụng try-catch cho async operations**
- **Kiểm tra dependency array trong useCallback/useEffect**
- **Debug logs sẽ giúp xác định vấn đề nhanh chóng**

