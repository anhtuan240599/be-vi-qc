# Hướng dẫn quy trình Test API cho QC

---

## 1. Tổng quan quy trình test 1 API

```
┌─────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│  Đọc hiểu   │───>│  Chuẩn bị   │───>│  Thực hiện   │───>│  Ghi kết    │───>│  Báo cáo     │
│  API Doc     │    │  Test Data  │    │  Test        │    │  quả        │    │  Bug (nếu có)│
└─────────────┘    └─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
```

---

## 2. Chi tiết từng bước

### Bước 1: Đọc hiểu API Documentation

Trước khi test, QC cần hiểu rõ:

| Cần hiểu | Ví dụ |
|-----------|-------|
| URL endpoint | `POST /api/auth/login` |
| Method | GET, POST, PUT, PATCH, DELETE |
| Cần auth không? | Có → cần Bearer token |
| Request body gồm gì? | `{ email, password }` |
| Các field nào required? | email ✅, password ✅ |
| Validation rules? | password >= 6 ký tự, email đúng format |
| Response thành công trả gì? | Status 200, body có `success: true` |
| Response lỗi trả gì? | Status 400/401/404, body có `error.message` |

### Bước 2: Chuẩn bị Test Data

Chia test data thành 3 nhóm:

**a) Happy path (dữ liệu đúng):**
```json
{
  "email": "admin@example.com",
  "password": "123456"
}
```

**b) Negative cases (dữ liệu sai):**
```json
// Thiếu field
{ "email": "admin@example.com" }
{ "password": "123456" }
{}

// Sai format
{ "email": "not-an-email", "password": "123456" }

// Sai giá trị
{ "email": "admin@example.com", "password": "wrong" }
{ "email": "notexist@example.com", "password": "123456" }
```

**c) Edge cases (biên):**
```json
// Password đúng 6 ký tự (boundary)
{ "email": "test@test.com", "password": "123456" }

// Password 5 ký tự (dưới boundary)
{ "email": "test@test.com", "password": "12345" }

// Field rỗng
{ "email": "", "password": "" }

// Ký tự đặc biệt
{ "email": "test@test.com", "password": "p@$$w0rd!#" }
```

### Bước 3: Thực hiện Test

Với mỗi test case, thực hiện theo thứ tự:

```
1. Mở Postman / Swagger UI
2. Chọn đúng Method + URL
3. Set header (nếu cần auth):
   Authorization: Bearer <token>
4. Điền request body
5. Nhấn Send / Execute
6. Kiểm tra response:
   ✓ Status code đúng không?
   ✓ Response body format đúng không?
   ✓ Data trả về đúng không?
   ✓ Error message rõ ràng không?
7. Ghi kết quả vào bảng
```

### Bước 4: Ghi kết quả test

Dùng bảng sau cho mỗi endpoint:

---

## 3. Template ghi kết quả test

### Thông tin chung

| Mục | Nội dung |
|-----|----------|
| Tester | [Tên QC] |
| Ngày test | [DD/MM/YYYY] |
| Môi trường | localhost:3000 / ngrok URL |
| API Version | 1.0.0 |
| Tool sử dụng | Postman / Swagger UI |

---

### Test Report: POST /api/auth/login

**Mô tả:** Đăng nhập, nhận access token và refresh token.

**Precondition:** Đã có tài khoản admin (đã register trước đó).

#### Test Cases & Kết quả:

| # | Test Case | Input | Expected Status | Expected Response | Actual Status | Actual Response | Result | Note |
|---|-----------|-------|-----------------|-------------------|---------------|-----------------|--------|------|
| TC-01 | Login đúng email + password | `{"email":"admin@example.com","password":"123456"}` | 200 | `success:true`, có accessToken + refreshToken | | | | |
| TC-02 | Thiếu email | `{"password":"123456"}` | 400 | `"email and password are required"` | | | | |
| TC-03 | Thiếu password | `{"email":"admin@example.com"}` | 400 | `"email and password are required"` | | | | |
| TC-04 | Body rỗng | `{}` | 400 | `"email and password are required"` | | | | |
| TC-05 | Email không tồn tại | `{"email":"noone@x.com","password":"123456"}` | 401 | `"Invalid email or password"` | | | | |
| TC-06 | Sai password | `{"email":"admin@example.com","password":"wrong"}` | 401 | `"Invalid email or password"` | | | | |
| TC-07 | Tài khoản inactive | `{"email":"inactive@x.com","password":"123456"}` | 403 | `"Account is inactive"` | | | | |

**Tổng kết:**
- Tổng test case: 7
- Pass: ___ / Fail: ___ / Block: ___

---

### Test Report: POST /api/auth/register

**Mô tả:** Đăng ký tài khoản admin.

**Precondition:** Không.

| # | Test Case | Input | Expected Status | Expected Response | Actual Status | Actual Response | Result | Note |
|---|-----------|-------|-----------------|-------------------|---------------|-----------------|--------|------|
| TC-08 | Register đầy đủ thông tin | `{"username":"admin","email":"admin@example.com","password":"123456"}` | 201 | `success:true`, user data, role=admin | | | | |
| TC-09 | Thiếu username | `{"email":"a@b.com","password":"123456"}` | 400 | `"username, email, and password are required"` | | | | |
| TC-10 | Thiếu email | `{"username":"test","password":"123456"}` | 400 | `"username, email, and password are required"` | | | | |
| TC-11 | Thiếu password | `{"username":"test","email":"a@b.com"}` | 400 | `"username, email, and password are required"` | | | | |
| TC-12 | Password < 6 ký tự | `{"username":"test","email":"a@b.com","password":"123"}` | 400 | `"Password must be at least 6 characters"` | | | | |
| TC-13 | Email sai format | `{"username":"test","email":"not-email","password":"123456"}` | 400 | `"Invalid email format"` | | | | |
| TC-14 | Email đã tồn tại | (dùng email đã register) | 409 | `"Username or email already exists"` | | | | |
| TC-15 | Username đã tồn tại | (dùng username đã register) | 409 | `"Username or email already exists"` | | | | |

---

### Test Report: POST /api/auth/refresh

**Mô tả:** Lấy cặp token mới bằng refresh token.

**Precondition:** Đã login, có refresh token.

| # | Test Case | Input | Expected Status | Expected Response | Actual Status | Actual Response | Result | Note |
|---|-----------|-------|-----------------|-------------------|---------------|-----------------|--------|------|
| TC-16 | Refresh token hợp lệ | `{"refreshToken":"<valid>"}` | 200 | Cặp token mới | | | | |
| TC-17 | Thiếu refreshToken | `{}` | 400 | `"refreshToken is required"` | | | | |
| TC-18 | Token không tồn tại | `{"refreshToken":"fake123"}` | 401 | `"Invalid refresh token"` | | | | |
| TC-19 | Dùng token cũ (đã rotate) | `{"refreshToken":"<old>"}` | 401 | `"Invalid refresh token"` | | | | |
| TC-20 | Dùng access token mới sau refresh | Header: Bearer <new_token> | 200 | Truy cập API bình thường | | | | |

---

### Test Report: GET /api/users

**Mô tả:** Lấy danh sách users có phân trang.

**Precondition:** Đã login, có access token. Đã tạo một số users.

| # | Test Case | Params | Expected Status | Expected Response | Actual Status | Actual Response | Result | Note |
|---|-----------|--------|-----------------|-------------------|---------------|-----------------|--------|------|
| TC-21 | List mặc định | (không params) | 200 | page=1, limit=10, có data array | | | | |
| TC-22 | Có pagination | `?page=1&limit=2` | 200 | data.length <= 2 | | | | |
| TC-23 | Search theo username | `?search=admin` | 200 | Chỉ có user match | | | | |
| TC-24 | Search không kết quả | `?search=xyz999` | 200 | data = [], total = 0 | | | | |
| TC-25 | page=0 (boundary) | `?page=0` | 200 | Auto thành page=1 | | | | |
| TC-26 | limit=999 (boundary) | `?limit=999` | 200 | Auto cap thành 100 | | | | |
| TC-27 | Không có token | (bỏ header Auth) | 401 | `"No token provided"` | | | | |
| TC-28 | Token hết hạn | (dùng token cũ) | 401 | `"Token has expired"` | | | | |

---

### Test Report: POST /api/users

**Mô tả:** Tạo user mới.

**Precondition:** Đã login, có access token.

| # | Test Case | Input | Expected Status | Expected Response | Actual Status | Actual Response | Result | Note |
|---|-----------|-------|-----------------|-------------------|---------------|-----------------|--------|------|
| TC-29 | Tạo đầy đủ thông tin | `{"username":"john","email":"john@x.com","password":"123456","role":"user","status":"active"}` | 201 | User data đầy đủ | | | | |
| TC-30 | Chỉ required fields | `{"username":"jane","email":"jane@x.com","password":"123456"}` | 201 | role=user, status=active (default) | | | | |
| TC-31 | Thiếu username | `{"email":"a@b.com","password":"123456"}` | 400 | Error message | | | | |
| TC-32 | Email sai format | `{"username":"test","email":"bad","password":"123456"}` | 400 | `"Invalid email format"` | | | | |
| TC-33 | Role không hợp lệ | `{"username":"t","email":"t@t.com","password":"123456","role":"superadmin"}` | 400 | `"Role must be admin or user"` | | | | |
| TC-34 | Status không hợp lệ | `{"username":"t","email":"t@t.com","password":"123456","status":"banned"}` | 400 | `"Status must be active or inactive"` | | | | |
| TC-35 | Email trùng | (dùng email đã tồn tại) | 409 | `"Username or email already exists"` | | | | |

---

### Test Report: PUT /api/users/:id

**Mô tả:** Cập nhật user.

**Precondition:** Đã login, có user ID cần update.

| # | Test Case | Input | Expected Status | Expected Response | Actual Status | Actual Response | Result | Note |
|---|-----------|-------|-----------------|-------------------|---------------|-----------------|--------|------|
| TC-36 | Update username | `{"username":"john_v2"}` | 200 | username đã đổi | | | | |
| TC-37 | Update role | `{"role":"admin"}` | 200 | role=admin | | | | |
| TC-38 | Update password | `{"password":"newpass123"}` | 200 | Thành công, login lại bằng pass mới | | | | |
| TC-39 | Không gửi password | `{"username":"test"}` | 200 | Password cũ vẫn dùng được | | | | |
| TC-40 | ID không tồn tại | PUT /api/users/9999 | 404 | `"User not found"` | | | | |
| TC-41 | Email trùng user khác | `{"email":"<existing>"}` | 409 | `"Username or email already exists"` | | | | |

---

### Test Report: DELETE /api/users/:id

**Mô tả:** Xóa user.

**Precondition:** Đã login, có user ID cần xóa.

| # | Test Case | Input | Expected Status | Expected Response | Actual Status | Actual Response | Result | Note |
|---|-----------|-------|-----------------|-------------------|---------------|-----------------|--------|------|
| TC-42 | Xóa user tồn tại | DELETE /api/users/2 | 200 | `"User deleted successfully"` | | | | |
| TC-43 | Xóa user không tồn tại | DELETE /api/users/9999 | 404 | `"User not found"` | | | | |
| TC-44 | Get user sau khi xóa | GET /api/users/2 | 404 | `"User not found"` | | | | |

---

## 4. Quy trình thực hiện test theo thứ tự

```
Ngày 1: Setup + Smoke test
├── Cài Postman
├── Import API doc / mở Swagger
├── Test health check
├── Register + Login → lấy token
└── Thử 1 request GET /api/users → verify kết nối OK

Ngày 2: Test Auth APIs
├── Test tất cả case Register (TC-08 → TC-15)
├── Test tất cả case Login (TC-01 → TC-07)
├── Test Refresh token (TC-16 → TC-20)
└── Ghi kết quả

Ngày 3: Test User CRUD
├── Test List users (TC-21 → TC-28)
├── Test Create user (TC-29 → TC-35)
├── Test Update user (TC-36 → TC-41)
├── Test Delete user (TC-42 → TC-44)
└── Ghi kết quả

Ngày 4: Review + Báo cáo
├── Retest các case FAIL
├── Tổng hợp kết quả
└── Viết bug report (nếu có)
```

---

## 5. Khi phát hiện Bug - Cách viết Bug Report

```
┌─────────────────────────────────────────────┐
│ Bug ID: BUG-001                             │
│ Title: Login trả 500 khi gửi body rỗng     │
│ Severity: Medium                            │
│ Priority: High                              │
│                                             │
│ Steps to reproduce:                         │
│ 1. POST /api/auth/login                     │
│ 2. Body: {}                                 │
│ 3. Nhấn Send                                │
│                                             │
│ Expected: Status 400, message rõ ràng       │
│ Actual: Status 500, "Internal server error" │
│                                             │
│ Environment: localhost:3000                  │
│ Screenshot: [đính kèm]                      │
│ Tester: [Tên]                               │
│ Date: [DD/MM/YYYY]                          │
└─────────────────────────────────────────────┘
```

**Severity levels:**
| Level | Mô tả | Ví dụ |
|-------|--------|-------|
| Critical | App crash, mất data | Server crash khi tạo user |
| High | Chức năng chính không hoạt động | Login luôn trả 500 |
| Medium | Chức năng phụ lỗi | Search không filter đúng |
| Low | UI/UX, typo | Error message sai chính tả |

---

## 6. Tổng hợp kết quả cuối cùng

### Summary Report

| Mục | Số lượng |
|-----|----------|
| Tổng test case | 44 |
| Passed | ___ |
| Failed | ___ |
| Blocked | ___ |
| Not tested | ___ |
| Bugs found | ___ |

### Theo module:

| Module | Total | Pass | Fail | Block |
|--------|-------|------|------|-------|
| Auth - Register | 8 | | | |
| Auth - Login | 7 | | | |
| Auth - Refresh | 5 | | | |
| Users - List | 8 | | | |
| Users - Create | 7 | | | |
| Users - Update | 6 | | | |
| Users - Delete | 3 | | | |

### Kết luận:
- [ ] API sẵn sàng release
- [ ] Cần fix bug trước khi release
- [ ] Cần test thêm
