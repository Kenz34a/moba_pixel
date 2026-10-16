# Vương Giới — Pixel Arena

Game MOBA pixel 5v5 chạy trực tiếp trên trình duyệt, với giao diện tiếng Việt. Người chơi điều khiển một tướng, sát cánh cùng 4 đồng đội AI để phá nhà chính của đội địch.

## Chạy game

Yêu cầu Node.js 20.19+ hoặc 22.12+. Môi trường cloud hiện dùng Node.js 24.

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
npm run preview
npm test
```

`build` kiểm tra TypeScript rồi tạo `dist/`. Có thể phục vụ thư mục này trên dịch vụ lưu trữ tĩnh. Phông chữ được đóng gói tại chỗ, pixel art vẽ bằng Canvas, âm thanh tạo bằng Web Audio; trận đấu không tải tài nguyên từ CDN.

Kiểm thử Playwright dùng Chromium ở `/usr/bin/chromium` trong môi trường cloud. Trên máy khác, truyền đường dẫn trình duyệt bằng `CHROMIUM_PATH=/path/to/chromium npm test`. Bộ 16 kiểm thử khởi động Vite nếu cần và kiểm tra chọn tướng/trang phục, 18 sprite có hình dáng khác nhau và vẽ đủ trong khung, chuyển hồ sơ cũ, trận 5v5, di chuyển, lính, tạm dừng, mua đồ, 18 kỹ năng, AI, hồi sinh, biến về, bảo hộ nhà chính, thắng trận, phần thưởng và cảm ứng.

## Cấu trúc

- `src/main.ts`: sảnh đấu, hộp thoại, HUD, hồ sơ và kết quả.
- `src/game/engine.ts`: mô phỏng trận đấu, AI, chiến đấu, kỹ năng và tiến trình.
- `src/game/renderer.ts`: camera, vẽ chiến trường, hiệu ứng, thanh máu và bản đồ nhỏ.
- `src/game/art.ts`: pixel art nhân vật, trang phục, cảnh quan và công trình.
- `src/game/hero-art.ts`: 18 tạo hình pixel riêng, hoạt ảnh di chuyển/tấn công, đo khung và bộ nhớ đệm sprite.
- `src/game/data.ts`: dữ liệu tướng, kỹ năng, trang phục và trang bị.
- `src/game/audio.ts`: âm thanh Web Audio.
- `tests/arena.spec.ts`: kiểm thử tích hợp trình duyệt. Inspector `window.__arena` chỉ có trong bản development.

Bản hiện tại dành cho **một người chơi với AI**. Chơi mạng, tài khoản máy chủ và đồng bộ nhiều người chưa được triển khai. Tướng và trang phục là bản dựng pixel của nhân vật Vương Giả Vinh Diệu; chiến trường là bản đồ Thiên Vực của dự án. Giấy phép phông chữ nằm trong `public/licenses/`.
