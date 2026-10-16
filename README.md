# Vương Giới — Pixel Arena

Game MOBA pixel 5v5 chạy trực tiếp trên trình duyệt, với giao diện tiếng Việt. Người chơi điều khiển một tướng, sát cánh cùng 4 đồng đội AI để phá nhà chính của đội địch.

## Chạy game

Yêu cầu **Node.js 24 trở lên** để chạy API và SQLite tích hợp. Môi trường cloud đã có Node.js 24 và Chromium.

```sh
npm ci
npm run dev
```

Nhấn **VÀO TRẬN** trong sảnh. Chọn **Luyện tập** để bắt đầu ở cấp 4, mở sẵn chiêu cuối và có 2.000 vàng mua trang bị.

Trong môi trường cloud có thư mục home chỉ đọc, dùng `npm ci --cache /tmp/moba-npm-cache`.

## Nội dung

- **6 tướng Vương Giả Vinh Diệu dựng lại bằng pixel**: Lý Bạch, Điêu Thuyền, Hàn Tín, Hậu Nghệ, Lữ Bố và Đại Kiều.
- **18 kỹ năng**: lướt, đạn xuyên, sát thương vùng, choáng, làm chậm, hồi phục, lá chắn và chiêu cuối. Mỗi tướng có cách chơi riêng.
- **18 trang phục** mở sẵn; mỗi bộ có hình dáng, tóc, trang phục, vũ khí, phụ kiện và màu hiệu ứng tương ứng. Sảnh, chân dung, bảng điểm và nhân vật trong trận dùng chung sprite.
- **Bản đồ Thiên Vực**: ba đường, sông, rừng, 12 trụ, hai nhà chính, năm Thạch Linh và một Cổ Long.
- Lính xuất hiện mỗi 24 giây. Phải phá trụ ngoài trước trụ trong; phá hết trụ một đường để mở bảo hộ nhà chính.
- AI tự đi đường, đánh lính và tướng, dùng kỹ năng, mua trang bị và rút lui hồi máu.
- Cửa hàng sáu món có chỉ số thật, vàng, kinh nghiệm, cấp độ, hồi sinh, bảng điểm, bản đồ nhỏ và lịch sử hạ gục.
- Điều khiển cảm ứng, âm thanh tổng hợp, tùy chọn rung màn hình, tạm dừng, màn hình kết quả và phần thưởng.
- Thành tích, tướng, trang phục và cài đặt được lưu bằng `localStorage` trên từng trình duyệt.
- Khi chạy cùng máy chủ Node, hồ sơ khách và kết quả trận được đồng bộ vào SQLite; tên, vàng, kinh nghiệm và trạng thái khóa do admin quản lý.

## Quản trị

Chạy trong thư mục dự án:

```sh
npm run admin:create
npm run dev
```

Lệnh đầu yêu cầu tên đăng nhập và mật khẩu ít nhất 12 ký tự, có xác nhận. Mật khẩu được che khi nhập và lưu dưới dạng hash scrypt. Mở đường dẫn **`/admin`** trên cùng máy chủ để đăng nhập. Không có tài khoản hay mật khẩu mặc định.

- **Tổng quan:** số hồ sơ, số trận, tỷ lệ thắng, trận gần đây và tướng được sử dụng, lấy từ dữ liệu đã lưu.
- **Tướng:** sửa tên, mô tả, máu, công, tốc chạy, tầm đánh, chu kỳ đánh và hồi chiêu Q/E/R; bật hoặc tắt tướng cho người chơi lẫn bot.
- **Trang phục:** sửa tên, mô tả, trạng thái và năm màu của từng bộ; xem trước trực tiếp trên Canvas. Tạo hình và vũ khí vẫn dùng 18 mẫu pixel của game.
- **Người chơi:** tìm theo tên hoặc mã hồ sơ; đổi tên, vàng, kinh nghiệm, khóa/mở khóa kèm lý do. Hồ sơ bị khóa không ghi nhận trận hoặc nhận thưởng trên máy chủ.
- **Cấu hình game:** vàng khởi đầu, chu kỳ lính, máu trụ/nhà chính, vàng hạ gục, phần thưởng; bật bảo trì và thông báo sảnh.
- **Lịch sử thao tác và tài khoản:** xem người thực hiện, thời gian, nội dung thay đổi; đổi mật khẩu và đăng xuất.

Cấu hình có hiệu lực khi người chơi **tải lại sảnh**. Chỉ số trận đang chạy giữ nguyên. Phần thưởng thực được tính theo cấu hình trên máy chủ lúc nhận kết quả. Mỗi mã trận chỉ được thưởng một lần; kết quả chưa gửi được sẽ xếp hàng thử lại. Hồ sơ được cập nhật khi tải trang hoặc quay lại cửa sổ sảnh. Luôn còn ít nhất một tướng và một trang phục cho mỗi tướng.

Phiên admin dùng cookie HttpOnly, SameSite=Strict, hết hạn sau 8 giờ; các thay đổi cần CSRF và kiểm tra nguồn yêu cầu. Đăng nhập sai nhiều lần bị giới hạn. Đổi hoặc đặt lại mật khẩu thu hồi mọi phiên của tài khoản đó. Lưu cấu hình/hồ sơ dùng kiểm tra phiên bản để tránh ghi đè thay đổi từ phiên khác.

Nếu quên mật khẩu, chủ máy chủ chạy `npm run admin:create -- --username ten-admin --reset`. Có thể tạo thêm admin bằng cùng lệnh, với tên khác.

Xem [giao diện đăng nhập](docs/admin-login.png) và [bảng quản lý tướng](docs/admin-console.png). Các ảnh được chụp từ bản production với cơ sở dữ liệu thử riêng.

## Chạy production và lưu dữ liệu

```sh
npm ci
npm run build
npm run admin:create
npm start
```

Máy chủ phục vụ game, `/admin` và `/api` cùng nguồn; mặc định cổng `5173`, địa chỉ lắng nghe `0.0.0.0`. Dùng `PORT` và `HOST` để đổi. Đặt sau HTTPS và bật `VG_COOKIE_SECURE=true` khi triển khai công khai. Chỉ chủ máy chủ truy cập terminal và thư mục dữ liệu.

SQLite nằm trong **`.data/arena.sqlite`**, được giữ khi khởi động lại; thư mục và file có quyền hạn chế. Đặt `VG_DATA_DIR` nếu dùng ổ lưu trữ khác, và giữ nguyên đường dẫn cho cả máy chủ lẫn lệnh `admin:create`. Khi sao lưu, dừng máy chủ rồi sao chép **toàn bộ thư mục dữ liệu**, gồm các file WAL/SHM nếu có. `.data/`, `.env*`, mật khẩu và phiên đăng nhập không được đưa lên GitHub. Khi tự động hóa lần đầu, có thể cấp `VG_ADMIN_USERNAME` và `VG_ADMIN_PASSWORD` qua biến môi trường bí mật; chúng chỉ được dùng để tạo admin khi cơ sở dữ liệu chưa có admin.

Hồ sơ người chơi hiện là **hồ sơ khách theo cookie của từng trình duyệt**, chưa có đăng nhập người chơi hoặc đồng bộ tài khoản giữa thiết bị. Xóa cookie làm mất quyền truy cập hồ sơ khách cũ. Lần đầu kết nối, game nhập thành tích cũ từ `localStorage`. Trận đấu vẫn mô phỏng trên trình duyệt và kết quả do trình duyệt gửi; chưa có máy chủ mô phỏng trận hoặc chống gian lận cho xếp hạng.

## Tướng và trang phục

| Tướng | Mặc định | Trang phục 2 | Trang phục 3 |
| --- | --- | --- | --- |
| Lý Bạch | Thanh Liên Kiếm Tiên | Thiên Niên Chi Hồ | Phượng Cầu Hoàng |
| Điêu Thuyền | Bế Nguyệt Chi Nhan | Trọng Hạ Dạ Chi Mộng | Miêu Ảnh Huyễn Vũ |
| Hàn Tín | Quốc Sĩ Vô Song | Bạch Long Ngâm | Nhai Đầu Bá Vương |
| Hậu Nghệ | Bán Thần Chi Cung | Hoàng Kim Xạ Thủ | Vô Tận Tinh Mang |
| Lữ Bố | Vô Song Chi Ma | Thiên Ma Liễu Loạn | Mạt Nhật Cơ Giáp |
| Đại Kiều | Thương Hải Chi Diệu | Miêu Cẩu Nhật Ký | Bạch Hạc Lương Thần Nữ |

Tạo hình được vẽ lại bằng Canvas pixel theo các đặc điểm nhận diện của nhân vật và trang phục. Độ chi tiết và cơ chế kỹ năng được rút gọn cho game trình duyệt. `sourceName` và `sourceId` trong dữ liệu giúp nhận diện nhân vật tương ứng. Chọn tướng/trang phục từ phiên bản trước tự chuyển sang ID mới và giữ nguyên thành tích.

[Xem đủ 18 tạo hình pixel](docs/trang-phuc-vuong-gia-pixel.png).

## Điều khiển

| Thao tác | Điều khiển |
| --- | --- |
| Di chuyển | WASD, phím mũi tên, hoặc nhấp chuột vào mặt đất |
| Truy đuổi / chọn mục tiêu | Nhấp chuột vào kẻ địch |
| Đánh thường | Tự động khi địch trong tầm; giữ Space hoặc nút ĐÁNH để đứng giao chiến |
| Kỹ năng | Q, E, R; ngắm bằng chuột, hoặc chạm nút để tự chọn mục tiêu gần |
| Chiêu cuối | R, mở khóa ở cấp 4 |
| Hồi phục | F: hồi 30% máu, hồi chiêu 35 giây |
| Biến về | B: niệm 4 giây, di chuyển hoặc nhận sát thương sẽ hủy |
| Cửa hàng / mua nhanh | P / 1 |
| Bảng điểm | Tab |
| Tạm dừng | Escape |
| Di chuyển xa | Nhấp/chạm bản đồ nhỏ |

Điện thoại dùng cần điều khiển bên trái và các nút bên phải. Có thể chơi cả dọc và ngang màn hình.

## Build và kiểm thử

```sh
npm run build
npm start
npm test
```

`build` kiểm tra TypeScript rồi tạo `dist/`. `npm start` phục vụ bản production cùng API; `npm run preview` dùng Vite preview cùng API để kiểm tra cục bộ. Phục vụ `dist/` trên lưu trữ tĩnh vẫn chơi được với hồ sơ cục bộ, nhưng quản trị và đồng bộ SQLite cần máy chủ Node. Phông chữ được đóng gói tại chỗ, pixel art vẽ bằng Canvas, âm thanh tạo bằng Web Audio; trận đấu không tải tài nguyên từ CDN.

`npm test` chạy **7 kiểm thử backend và 23 kiểm thử trình duyệt**. Backend kiểm tra đăng nhập, thu hồi phiên, lưu SQLite qua kết nối mới, xác thực cấu hình, xung đột phiên bản, quản lý hồ sơ, thưởng một lần, CSRF, nguồn yêu cầu, giới hạn đăng nhập và CLI tạo admin. Trình duyệt kiểm tra toàn bộ màn hình admin, xem trước skin, cấu hình áp dụng vào trận, khóa hồ sơ, đổi mật khẩu, điện thoại và 16 kịch bản gameplay gồm cả 18 kỹ năng.

Playwright dùng Chromium ở `/usr/bin/chromium`; trên máy khác, truyền `CHROMIUM_PATH=/path/to/chromium npm test`. Nó tự khởi động Vite ở cổng `5183` với SQLite riêng trong `/tmp/vg-e2e-*` và mật khẩu admin ngẫu nhiên, không dùng dữ liệu thật. Có thể chạy riêng backend bằng `npm run test:server`.

## Cấu trúc

- `src/main.ts`: sảnh đấu, hộp thoại, HUD, hồ sơ và kết quả.
- `src/game/engine.ts`: mô phỏng trận đấu, AI, chiến đấu, kỹ năng và tiến trình.
- `src/game/renderer.ts`: camera, vẽ chiến trường, hiệu ứng, thanh máu và bản đồ nhỏ.
- `src/game/art.ts`: pixel art nhân vật, trang phục, cảnh quan và công trình.
- `src/game/hero-art.ts`: 18 tạo hình pixel riêng, hoạt ảnh di chuyển/tấn công, đo khung và bộ nhớ đệm sprite.
- `src/game/data.ts`: dữ liệu tướng, kỹ năng, trang phục và trang bị.
- `src/game/audio.ts`: âm thanh Web Audio.
- `src/game/runtime.ts`: nạp cấu hình, đồng bộ hồ sơ và hàng đợi gửi kết quả.
- `src/admin/`: đăng nhập và bảng quản trị responsive.
- `src/shared/config.ts`: kiểu dữ liệu và cấu hình mặc định dùng chung.
- `server/`: API, xác thực, SQLite, phục vụ production và CLI tạo admin; không cần gói backend bên ngoài.
- `vite.config.ts`: gắn API vào development và preview cùng cổng.
- `tests/admin.spec.ts`, `tests/server.test.mjs`: kiểm thử quản trị và backend.
- `tests/arena.spec.ts`: kiểm thử tích hợp trình duyệt. Inspector `window.__arena` chỉ có trong bản development.

Bản hiện tại dành cho **một người chơi với AI**, có quản trị trên máy chủ; chưa có đấu mạng nhiều người. Tướng và trang phục là bản dựng pixel của nhân vật Vương Giả Vinh Diệu; chiến trường là bản đồ Thiên Vực của dự án. Giấy phép phông chữ nằm trong `public/licenses/`.
