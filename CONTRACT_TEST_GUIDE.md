# Hướng dẫn Test Contract

## Vấn đề hiện tại

Từ console logs, tôi thấy:
1. **Domain name rỗng**: `Domain name: ` (không có gì)
2. **Hook không được enable**: `Is enabled: false`
3. **Lỗi hex string odd length**: Khi test function `rentPrice`

## Component Test mới

Tôi đã tạo component `ContractTest` để test trực tiếp contract mà không cần qua React hooks.

### Cách sử dụng:

1. **Refresh trang** để thấy component test mới
2. **Nhấn các nút test** theo thứ tự:

#### 🔵 **Test Contract**
- Kiểm tra contract có code không
- Kiểm tra chain ID
- Kiểm tra network

#### 🟢 **Test RentPrice** 
- Test function `rentPrice(string,uint256)`
- Sử dụng domain "test123"
- Kiểm tra contract có hoạt động không

#### 🟣 **Test Available**
- Test function `available(string)`
- Sử dụng domain ngẫu nhiên
- Kiểm tra domain availability

### Kết quả mong đợi:

#### Nếu contract hoạt động bình thường:
```
Contract address: 0x1e7339b9e6dc09be0650a3163f367574679e7497
Contract code length: [số lớn hơn 2]
Chain ID: [chain ID]
Has code: true

Testing rentPrice for domain: test123
Function selector: 0x[4 ký tự hex]
Data: 0x[hex data dài]
RentPrice result: 0x[hex result]

Testing available for domain: test1234567890
Function selector: 0x[4 ký tự hex]
Data: 0x[hex data dài]
Available result: 0x0000000000000000000000000000000000000000000000000000000000000001
Is available: true
```

#### Nếu có lỗi:
- **Contract code length: 2** → Contract không tồn tại
- **RentPrice error** → Function không tồn tại hoặc sai tham số
- **Available error** → Function không tồn tại

## Debug steps:

1. **Nhấn "Test Contract"** trước
2. **Nhấn "Test RentPrice"** 
3. **Nhấn "Test Available"**
4. **Copy kết quả** và gửi cho tôi

## Nếu test thành công:

Sau khi xác nhận contract hoạt động, chúng ta sẽ:
1. Fix hook `useDomainAvailability`
2. Fix component `RegisterDomain`
3. Test đăng ký domain thật

## Nếu test thất bại:

Chúng ta cần:
1. Kiểm tra contract address có đúng không
2. Kiểm tra network có đúng không  
3. Kiểm tra ABI có đúng không
4. Có thể cần deploy lại contract

---

**Hãy thử component test mới và cho tôi biết kết quả!**

