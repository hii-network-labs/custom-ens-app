# Hướng dẫn khắc phục lỗi "Insufficient Funds"

## Lỗi thường gặp

### 1. Lỗi "insufficient funds for gas * price + value"

Lỗi này xảy ra khi tài khoản của bạn không có đủ số dư để trang trải chi phí giao dịch.

#### Nguyên nhân:
- Số dư HII không đủ để trả phí đăng ký domain
- Số dư không đủ để trả phí gas
- Tổng chi phí (phí đăng ký + phí gas) vượt quá số dư hiện tại

#### Cách khắc phục:

1. **Kiểm tra số dư hiện tại**
   - Xem số dư HII trong ví của bạn
   - Đảm bảo có đủ tiền cho cả phí đăng ký và gas

2. **Nạp thêm HII**
   - Chuyển HII từ ví khác vào ví hiện tại
   - Hoặc mua HII từ sàn giao dịch

3. **Tính toán chi phí cần thiết**
   - Phí đăng ký domain: Hiển thị trong form
   - Phí gas ước tính: ~0.0015 HII (150,000 gas × 10 gwei)
   - Tổng cần: Phí đăng ký + Phí gas

4. **Thử lại sau khi nạp đủ tiền**
   - Đảm bảo số dư > Tổng chi phí
   - Nhấn "Thử lại" trong form

### 2. Lỗi "The total cost exceeds the balance"

#### Nguyên nhân:
- Gas limit quá cao
- Giá gas cao hơn dự kiến
- Số dư không đủ

#### Cách khắc phục:

1. **Giảm gas limit** (Đã được fix trong code)
2. **Chờ giá gas giảm**
3. **Nạp thêm tiền**

### 3. Lỗi "address 0x0000000000000000000000000000000000000000 have 0"

#### Nguyên nhân:
- Ví chưa được kết nối
- Địa chỉ ví không hợp lệ
- Số dư = 0

#### Cách khắc phục:

1. **Kết nối ví**
   - Đảm bảo MetaMask đã kết nối
   - Chọn đúng mạng Hii Network

2. **Kiểm tra địa chỉ ví**
   - Đảm bảo địa chỉ ví hợp lệ
   - Có số dư HII > 0

## Các bước kiểm tra trước khi đăng ký

1. **Kết nối ví**
   ```
   ✅ MetaMask đã kết nối
   ✅ Đúng mạng Hii Network
   ✅ Địa chỉ ví hợp lệ
   ```

2. **Kiểm tra số dư**
   ```
   ✅ Số dư HII > 0
   ✅ Số dư > Tổng chi phí (phí đăng ký + gas)
   ```

3. **Kiểm tra thông tin domain**
   ```
   ✅ Tên domain hợp lệ (3-63 ký tự)
   ✅ Domain chưa được đăng ký
   ✅ Thời gian đăng ký hợp lệ
   ```

## Thông tin liên hệ

Nếu vẫn gặp lỗi sau khi thực hiện các bước trên, vui lòng:

1. Chụp màn hình lỗi
2. Ghi lại các bước đã thực hiện
3. Liên hệ hỗ trợ với thông tin:
   - Địa chỉ ví
   - Tên domain muốn đăng ký
   - Thời gian xảy ra lỗi
   - Mô tả chi tiết lỗi

## Lưu ý quan trọng

- **Luôn kiểm tra số dư trước khi đăng ký**
- **Để lại một ít HII cho các giao dịch khác**
- **Không đóng trình duyệt trong quá trình đăng ký**
- **Đảm bảo kết nối mạng ổn định**

