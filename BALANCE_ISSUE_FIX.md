# Khắc phục lỗi "Số dư không đủ" khi có nhiều balance

## Vấn đề
Bạn gặp lỗi "Số dư không đủ để thực hiện giao dịch" mặc dù ví có nhiều balance.

## Nguyên nhân có thể

### 1. **Cache balance cũ**
- Wagmi có thể cache balance cũ
- Balance chưa được cập nhật sau khi nạp tiền

### 2. **Tính toán gas sai**
- Gas estimate quá cao
- Gas price không chính xác
- Buffer quá lớn

### 3. **Network không đồng bộ**
- RPC node chưa sync balance mới
- MetaMask cache balance cũ

### 4. **Decimal precision**
- Lỗi tính toán do decimal
- Overflow trong bigint calculation

## Cách khắc phục

### Bước 1: Refresh Balance
1. Nhấn nút **"Cập nhật số dư"** trong form
2. Hoặc refresh trang (F5)
3. Kiểm tra balance trong MetaMask

### Bước 2: Sử dụng nút "Thử đăng ký"
1. Nếu bạn chắc chắn có đủ tiền
2. Nhấn nút **"Thử đăng ký (bỏ qua kiểm tra số dư)"**
3. Giao dịch sẽ được thực hiện trực tiếp

### Bước 3: Kiểm tra trong MetaMask
1. Mở MetaMask
2. Chọn đúng mạng Hii Network
3. Kiểm tra balance hiển thị
4. Thử chuyển một ít HII để refresh balance

### Bước 4: Debug thông tin
Trong development mode, bạn sẽ thấy:
```
Debug Info:
Balance: X.XXXXXX HII
Price: X.XXXXXX HII  
Gas Cost: X.XXXXXX HII
Total Cost: X.XXXXXX HII
Difference: X.XXXXXX HII
Has Enough: ✅ Yes / ❌ No
```

## Các lệnh debug

### Kiểm tra balance trong console:
```javascript
// Mở DevTools (F12) và chạy:
const balance = await window.ethereum.request({
  method: 'eth_getBalance',
  params: ['YOUR_ADDRESS', 'latest']
});
console.log('Balance:', parseInt(balance, 16) / 1e18, 'HII');
```

### Kiểm tra gas price:
```javascript
const gasPrice = await window.ethereum.request({
  method: 'eth_gasPrice'
});
console.log('Gas Price:', parseInt(gasPrice, 16) / 1e9, 'Gwei');
```

## Giải pháp tạm thời

### 1. **Bỏ qua kiểm tra balance**
- Sử dụng nút "Thử đăng ký"
- Giao dịch sẽ được thực hiện trực tiếp
- MetaMask sẽ tự kiểm tra balance

### 2. **Giảm gas limit**
- Gas limit hiện tại: 150,000
- Có thể giảm xuống 100,000 nếu cần

### 3. **Chờ sync**
- Đợi 1-2 phút để RPC sync
- Thử lại sau

## Thông tin kỹ thuật

### Gas calculation:
```javascript
const gasEstimate = BigInt(150000) // 150k gas
const gasPrice = BigInt(10) * BigInt(10 ** 9) // 10 gwei
const estimatedGasCost = gasEstimate * gasPrice
const totalCost = price + estimatedGasCost
```

### Balance check:
```javascript
if (balance.value < totalCost) {
  // Show insufficient funds error
}
```

## Liên hệ hỗ trợ

Nếu vẫn gặp vấn đề, vui lòng cung cấp:
1. Screenshot balance trong MetaMask
2. Screenshot debug info
3. Console logs
4. Địa chỉ ví
5. Tên domain muốn đăng ký

