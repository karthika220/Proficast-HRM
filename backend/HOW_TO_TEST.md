# How to Test Employee Management System

## Quick Test (Automated)

Run the automated test script:

```bash
cd backend
node test-employees.js
```

This will test:
- ✅ Login functionality
- ✅ Get employees endpoint
- ✅ Access control (role-based permissions)
- ✅ Authentication requirements

---

## Manual Testing with Postman/Thunder Client

### Prerequisites

1. **Start the server:**
   ```bash
   cd backend
   npm start
   # or for development with auto-reload
   npm run dev
   ```

2. **Make sure database is seeded:**
   ```bash
   npm run seed
   ```

---

## Step-by-Step Testing Guide

### Step 1: Login and Get Token

**Request:**
```
POST http://localhost:5000/auth/login
Content-Type: application/json

{
  "email": "admin@profitcast.com",
  "password": "admin123"
}
```

**Expected Response (200 OK):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "...",
    "employeeId": "...",
    "email": "admin@profitcast.com",
    "role": "MD"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**✅ Copy the token** - You'll need it for all protected routes!

---

### Step 2: Test GET /employees

**Request:**
```
GET http://localhost:5000/employees
Authorization: Bearer <your-token>
```

**Expected Response (200 OK):**
```json
{
  "count": 2,
  "employees": [
    {
      "id": "...",
      "employeeId": "...",
      "fullName": "...",
      "email": "...",
      "role": "..."
    }
  ]
}
```

**✅ Test Results:**
- As MD/HR: Should see all employees
- As MANAGER: Should see only direct reports
- As EMPLOYEE: Should see only themselves

---

### Step 3: Test POST /employees (Create - HR Only)

**Request:**
```
POST http://localhost:5000/employees
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "employeeId": "EMP002",
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "EMPLOYEE",
  "department": "IT",
  "designation": "Developer"
}
```

**Expected Results:**
- ✅ As HR: Should succeed (201 Created)
- ❌ As MD: Should fail (403 Forbidden)
- ❌ As MANAGER: Should fail (403 Forbidden)
- ❌ As EMPLOYEE: Should fail (403 Forbidden)

---

### Step 4: Test GET /employees/:id

**Request:**
```
GET http://localhost:5000/employees/<employee-id>
Authorization: Bearer <your-token>
```

**Expected Results:**
- ✅ MD/HR viewing any employee: Should succeed
- ✅ MANAGER viewing direct report: Should succeed
- ✅ EMPLOYEE viewing themselves: Should succeed
- ❌ MANAGER viewing non-report: Should fail (403)
- ❌ EMPLOYEE viewing others: Should fail (403)

---

### Step 5: Test PUT /employees/:id (Update)

**Request:**
```
PUT http://localhost:5000/employees/<employee-id>
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "fullName": "Updated Name",
  "department": "New Department"
}
```

**Expected Results:**
- ✅ HR/MD updating any employee: Should succeed
- ✅ MANAGER updating direct report: Should succeed
- ✅ EMPLOYEE updating themselves (limited fields): Should succeed
- ❌ EMPLOYEE updating others: Should fail (403)

---

### Step 6: Test PATCH /employees/:id/archive (HR Only)

**Request:**
```
PATCH http://localhost:5000/employees/<employee-id>/archive
Authorization: Bearer <your-token>
```

**Expected Results:**
- ✅ As HR: Should succeed (200 OK)
- ❌ As MD: Should fail (403 Forbidden)
- ❌ As MANAGER: Should fail (403 Forbidden)

---

### Step 7: Test Access Control (No Token)

**Request:**
```
GET http://localhost:5000/employees
(No Authorization header)
```

**Expected Response:**
- ❌ Should fail with 401 Unauthorized

---

## Testing Checklist

- [ ] Server is running (`npm start`)
- [ ] Can login and get token
- [ ] Can get employees list (role-based filtering works)
- [ ] Cannot create employee as non-HR (403 Forbidden)
- [ ] Can get employee by ID (access control works)
- [ ] Can update employee (access control works)
- [ ] Cannot access without token (401 Unauthorized)
- [ ] Manager sees only direct reports
- [ ] Employee sees only themselves

---

## Common Test Scenarios

### Scenario 1: Create HR User for Testing

```bash
POST http://localhost:5000/auth/register
Content-Type: application/json

{
  "employeeId": "HR001",
  "fullName": "HR Manager",
  "email": "hr@profitcast.com",
  "password": "hr123",
  "role": "HR",
  "department": "Human Resources"
}
```

Then login with HR credentials to test HR-only endpoints.

### Scenario 2: Test Manager Access

1. Create a manager user
2. Create employees with that manager as `reportingManagerId`
3. Login as manager
4. Test that manager can only see their direct reports

### Scenario 3: Test Employee Self-Access

1. Create an employee
2. Login as that employee
3. Verify they can only see and update themselves

---

## Troubleshooting

**Issue: 401 Unauthorized**
- ✅ Check if token is included in Authorization header
- ✅ Format: `Authorization: Bearer <token>`
- ✅ Token might be expired - login again

**Issue: 403 Forbidden**
- ✅ Check user role - endpoint might require specific role
- ✅ Check access control rules for the endpoint

**Issue: 404 Not Found**
- ✅ Check if server is running
- ✅ Check if route path is correct
- ✅ Restart server to load new routes

**Issue: 500 Server Error**
- ✅ Check database connection (DATABASE_URL in .env)
- ✅ Check server logs for detailed error

---

## Success Indicators

✅ **All working correctly if:**
- Login returns token
- Employee endpoints require authentication
- Role-based access control works
- HR can create employees
- MD/HR can see all employees
- Manager sees only direct reports
- Employee sees only themselves

🎉 **System is working perfectly!**
