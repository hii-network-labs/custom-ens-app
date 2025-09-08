# ENS Manager - Hii Network

Ứng dụng quản lý ENS domains trên Hii Network được xây dựng với Next.js, TypeScript, wagmi và viem.

## Tính năng

- 🔗 **Kết nối ví**: Kết nối MetaMask với Hii Network
- 📋 **Quản lý domains**: Xem danh sách tất cả ENS domains đang sở hữu
- ✨ **Đăng ký mới**: Đăng ký ENS domain mới với quy trình commit-reveal
- 🔄 **Gia hạn**: Gia hạn thời gian sử dụng domain
- 🔀 **Chuyển nhượng**: Chuyển ownership domain cho ví khác
- 💰 **Tính giá**: Hiển thị giá đăng ký/gia hạn real-time
- 📊 **The Graph**: Truy vấn dữ liệu từ The Graph API

## Công nghệ sử dụng

- **Frontend**: Next.js 14, TypeScript, TailwindCSS
- **Web3**: wagmi, viem, MetaMask connector
- **Data**: The Graph Protocol, GraphQL
- **State Management**: React Query (@tanstack/react-query)

## Cài đặt và chạy

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình môi trường

File `.env.local` đã được tạo sẵn với cấu hình cho Hii Network:

```env
# Hii Network Configuration
NEXT_PUBLIC_CUSTOM_NETWORK_CHAIN_ID=22988
NEXT_PUBLIC_CUSTOM_NETWORK_NAME="Hii Network"
NEXT_PUBLIC_CUSTOM_NETWORK_RPC="http://103.69.98.80:8545"
# ... các cấu hình khác
```

### 3. Chạy ứng dụng

```bash
npm run dev
```

Ứng dụng sẽ chạy tại `http://localhost:3000`

## Cấu trúc dự án

```
src/
├── components/          # React components
│   ├── ENSApp.tsx      # Component chính
│   ├── DomainList.tsx  # Danh sách domains
│   ├── RegisterDomain.tsx # Đăng ký domain mới
│   ├── RenewDomain.tsx    # Gia hạn domain
│   └── TransferDomain.tsx # Chuyển nhượng domain
├── config/             # Cấu hình
│   ├── wagmi.ts       # Cấu hình wagmi và Hii Network
│   └── contracts.ts   # Địa chỉ contracts và ABI
├── hooks/             # Custom hooks
│   └── useENS.ts     # Hooks tương tác với ENS contracts
├── lib/              # Utilities
│   └── graphql.ts   # GraphQL queries và client
├── pages/           # Next.js pages
│   ├── _app.tsx    # App wrapper với providers
│   └── index.tsx   # Trang chính
└── styles/         # CSS styles
    └── globals.css # TailwindCSS globals
```

## Hướng dẫn sử dụng

### 1. Kết nối ví

- Nhấn "Kết nối MetaMask" để kết nối ví
- MetaMask sẽ tự động thêm Hii Network nếu chưa có
- Xác nhận kết nối trong MetaMask

### 2. Xem domains

- Tab "Domains của tôi" hiển thị tất cả domains đang sở hữu
- Thông tin bao gồm: tên domain, owner, ngày hết hạn, trạng thái

### 3. Đăng ký domain mới

- Chuyển sang tab "Đăng ký mới"
- Nhập tên domain (không bao gồm .hii)
- Chọn thời gian đăng ký (1-5 năm)
- Xem giá và nhấn "Bắt đầu đăng ký"
- **Bước 1**: Commit - xác nhận transaction trong MetaMask
- **Bước 2**: Chờ 60 giây (yêu cầu của ENS)
- **Bước 3**: Register - xác nhận transaction cuối cùng

### 4. Gia hạn domain

- Tab "Gia hạn": chọn domain và thời gian gia hạn
- Xem giá và xác nhận transaction

### 5. Chuyển nhượng domain

- Tab "Chuyển nhượng": chọn domain và nhập địa chỉ ví mới
- Xác nhận checkbox và thực hiện chuyển nhượng
- **Lưu ý**: Hành động này không thể hoàn tác!

## Thông tin Hii Network

- **Chain ID**: 22988
- **RPC URL**: http://103.69.98.80:8545
- **Explorer**: https://explorer.testnet.hii.network
- **Native Token**: HII
- **The Graph**: http://103.69.98.81:8000/subgraphs/name/graphprotocol/ens_eth

## ENS Contracts trên Hii Network

- **Registry**: 0x8bA3410bd15155F9bb25e46838A21D2eEa0c0945
- **ETH Registrar Controller**: 0x1e7339b9e6dC09BE0650a3163f367574679e7497
- **Public Resolver**: 0xa5895DC687Eb0672fCcd964da618dC99112F2D75
- **Base Registrar**: 0x222349495048799C19995a65b32d86D20f1BA57A

## Lưu ý quan trọng

1. **Testnet**: Đây là testnet, không sử dụng token thật
2. **MetaMask**: Cần cài đặt MetaMask extension
3. **Network**: Ứng dụng chỉ hoạt động trên Hii Network
4. **Commit-Reveal**: Đăng ký domain cần 2 bước và chờ 60 giây
5. **Gas Fee**: Mọi transaction đều cần gas fee bằng HII token

## Troubleshooting

### Lỗi kết nối
- Kiểm tra MetaMask đã cài đặt và mở khóa
- Đảm bảo đã chuyển sang Hii Network
- Kiểm tra kết nối internet

### Lỗi transaction
- Kiểm tra số dư HII token
- Tăng gas limit nếu cần
- Thử lại sau vài phút

### Lỗi GraphQL
- Kiểm tra kết nối The Graph API
- Thử refresh trang
- Kiểm tra console để xem lỗi chi tiết

## Scripts

```bash
# Development
npm run dev

# Build
npm run build

# Start production
npm start

# Lint
npm run lint
```