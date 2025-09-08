# Khắc phục lỗi Zero Address (0x0000...0000)

## Vấn đề
Lỗi `address 0x0000000000000000000000000000000000000000 have 0` có nghĩa là ứng dụng đang sử dụng địa chỉ ví zero thay vì địa chỉ ví thực của bạn.

## Nguyên nhân

### 1. **Wallet chưa được kết nối**
- MetaMask chưa được kết nối với ứng dụng
- Kết nối bị mất trong quá trình sử dụng

### 2. **Network không đúng**
- MetaMask đang ở network khác (Ethereum Mainnet)
- Cần chuyển sang Hii Network

### 3. **Account chưa được chọn**
- MetaMask có nhiều account nhưng chưa chọn account nào
- Account bị lock

### 4. **Wagmi configuration**
- Wagmi chưa được cấu hình đúng
- RPC endpoint không đúng

## Cách khắc phục

### Bước 1: Kiểm tra kết nối MetaMask
1. Mở MetaMask
2. Kiểm tra xem có hiển thị "Connected" không
3. Nếu không, nhấn "Connect" để kết nối lại

### Bước 2: Kiểm tra Network
1. Trong MetaMask, kiểm tra network hiện tại
2. Đảm bảo đang ở **Hii Network**
3. Nếu không, chuyển sang Hii Network

### Bước 3: Kiểm tra Account
1. Trong MetaMask, kiểm tra account đang được chọn
2. Đảm bảo account có balance HII
3. Nếu có nhiều account, chọn account có tiền

### Bước 4: Refresh ứng dụng
1. Refresh trang (F5)
2. Hoặc nhấn nút "Thử lại" trong ứng dụng

## Debug Information

### Console Logs cần kiểm tra:

```
=== COMPONENT ACCOUNT DEBUG ===
Address: 0x0000000000000000000000000000000000000000  ❌ Zero address
Is connected: false  ❌ Not connected
Status: disconnected  ❌ Disconnected
Balance: undefined  ❌ No balance
Is zero address: true  ❌ Is zero address
================================

=== ACCOUNT DEBUG ===
Account address: 0x0000000000000000000000000000000000000000  ❌ Zero address
Is connected: false  ❌ Not connected
Connection status: disconnected  ❌ Disconnected
Balance: undefined  ❌ No balance
Is zero address: true  ❌ Is zero address
=====================
```

### Console Logs đúng:

```
=== COMPONENT ACCOUNT DEBUG ===
Address: 0xb769BEFa05c7D9B08062630E351e865d3F49c56D  ✅ Real address
Is connected: true  ✅ Connected
Status: connected  ✅ Connected
Balance: 272977197014236654030  ✅ Has balance
Is zero address: false  ✅ Not zero address
================================

=== ACCOUNT DEBUG ===
Account address: 0xb769BEFa05c7D9B08062630E351e865d3F49c56D  ✅ Real address
Is connected: true  ✅ Connected
Connection status: connected  ✅ Connected
Balance: 272977197014236654030  ✅ Has balance
Is zero address: false  ✅ Not zero address
=====================
```

## Các bước kiểm tra

### 1. **Kiểm tra MetaMask**
```javascript
// Mở DevTools và chạy:
console.log('MetaMask installed:', typeof window.ethereum !== 'undefined')
console.log('Accounts:', await window.ethereum.request({ method: 'eth_accounts' }))
console.log('Network:', await window.ethereum.request({ method: 'eth_chainId' }))
```

### 2. **Kiểm tra Wagmi**
```javascript
// Trong component, thêm:
const { address, isConnected, status } = useAccount()
console.log('Wagmi address:', address)
console.log('Wagmi connected:', isConnected)
console.log('Wagmi status:', status)
```

### 3. **Kiểm tra Network ID**
- Hii Network Chain ID: `0x1e` (30 in decimal)
- Ethereum Mainnet: `0x1` (1 in decimal)

## Giải pháp tạm thời

### 1. **Disconnect và Reconnect**
1. Trong MetaMask, disconnect khỏi ứng dụng
2. Refresh trang
3. Connect lại MetaMask

### 2. **Switch Account**
1. Trong MetaMask, chuyển sang account khác
2. Chuyển lại account ban đầu

### 3. **Clear Browser Cache**
1. Clear browser cache và cookies
2. Restart browser
3. Thử lại

### 4. **Check RPC Configuration**
Kiểm tra file `src/config/wagmi.ts`:
```javascript
export const config = createConfig({
  chains: [hiiNetwork], // Đảm bảo đúng network
  transports: {
    [hiiNetwork.id]: http(process.env.NEXT_PUBLIC_CUSTOM_NETWORK_RPC)
  }
})
```

## Thông tin cần cung cấp

Khi báo lỗi, vui lòng cung cấp:
1. **Console logs đầy đủ** (Component và Account debug)
2. **MetaMask screenshot** (Network, Account, Connection status)
3. **Browser console** (Network tab, errors)
4. **Wagmi configuration** (nếu có thể)

## Lưu ý quan trọng

- **Luôn đảm bảo MetaMask đã kết nối trước khi sử dụng**
- **Kiểm tra network đúng (Hii Network)**
- **Đảm bảo account có balance HII**
- **Refresh trang nếu gặp vấn đề kết nối**

