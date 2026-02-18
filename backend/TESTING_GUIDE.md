# Employee Management System - Testing Guide

## Prerequisites

1. **Start the server:**
   ```bash
   cd backend
   npm start
   # or
   npm run dev
   ```

2. **Seed the database (if not done):**
   ```bash
   npm run seed
   ```

## Test Credentials

- **MD User:**
  - Email: `admin@profitcast.com`
  - Password: `admin123`
  - Role: `MD`

## Testing Steps

### Step 1: Login to Get Token

**Request:**
```bash
POST http://localhost:5000/auth/login
Content-Type: application/json

{
  "email": "admin@profitcast.com",
  "password": "admin123"
}
```

**Expected Response:**
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

**Save the token** for subsequent requests!

---

### Step 2: Create an HR User (for testing)

**Request:**
```bash
POST http://localhost:5000/auth/register
Content-Type: application/json

{
  "employeeId": "HR001",
  "fullName": "HR Manager",
  "email": "hr@profitcast.com",
  "password": "hr123",
  "role": "HR",
  "department": "Human Resources",
  "designation": "HR Manager"
}
```

**Expected Response:** 201 Created with user data and token

---

### Step 3: Create Employees (HR only)

**Request:**
```bash
POST http://localhost:5000/employees
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "employeeId": "EMP001",
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "EMPLOYEE",
  "department": "IT",
  "designation": "Software Developer",
  "phone": "+1234567890",
  "dateOfJoining": "2024-01-15"
}
```

**Expected Response:** 201 Created

**Test Cases:**
- ✅ Create employee as HR → Should succeed
- ❌ Create employee as MD → Should fail (403)
- ❌ Create employee as EMPLOYEE → Should fail (403)

---

### Step 4: Get All Employees

**Request:**
```bash
GET http://localhost:5000/employees
Authorization: Bearer <your-token>
```

**Expected Response:** List of employees based on role

**Test Cases:**
- **As MD/HR:** Should see all employees
- **As MANAGER:** Should see only direct reports
- **As EMPLOYEE:** Should see only themselves

---

### Step 5: Get Employee by ID

**Request:**
```bash
GET http://localhost:5000/employees/<employee-id>
Authorization: Bearer <your-token>
```

**Expected Response:** Employee details

**Test Cases:**
- ✅ MD/HR viewing any employee → Should succeed
- ✅ MANAGER viewing direct report → Should succeed
- ✅ EMPLOYEE viewing themselves → Should succeed
- ❌ MANAGER viewing non-report → Should fail (403)
- ❌ EMPLOYEE viewing others → Should fail (403)

---

### Step 6: Update Employee

**Request:**
```bash
PUT http://localhost:5000/employees/<employee-id>
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "fullName": "Updated Name",
  "department": "New Department",
  "designation": "Senior Developer"
}
```

**Expected Response:** Updated employee data

**Test Cases:**
- ✅ HR/MD updating any employee → Should succeed
- ✅ MANAGER updating direct report → Should succeed
- ✅ EMPLOYEE updating themselves (limited fields) → Should succeed
- ❌ EMPLOYEE updating others → Should fail (403)
- ❌ MANAGER updating non-report → Should fail (403)

---

### Step 7: Archive Employee (HR only)

**Request:**
```bash
PATCH http://localhost:5000/employees/<employee-id>/archive
Authorization: Bearer <your-token>
```

**Expected Response:** Archived employee data

**Test Cases:**
- ✅ HR archiving employee → Should succeed
- ❌ MD archiving employee → Should fail (403)
- ❌ MANAGER archiving employee → Should fail (403)

---

## Quick Test Checklist

- [ ] Server is running
- [ ] Can login and get token
- [ ] Can create employee (as HR)
- [ ] Cannot create employee (as non-HR)
- [ ] Can get all employees (role-based filtering works)
- [ ] Can get employee by ID (access control works)
- [ ] Can update employee (access control works)
- [ ] Can archive employee (HR only)
- [ ] Manager sees only direct reports
- [ ] Employee sees only themselves

## Common Issues

1. **401 Unauthorized:** Missing or invalid token
   - Solution: Login again and use the new token

2. **403 Forbidden:** Insufficient permissions
   - Solution: Check user role and access rules

3. **404 Not Found:** Employee doesn't exist
   - Solution: Verify employee ID

4. **500 Server Error:** Database connection issue
   - Solution: Check DATABASE_URL in .env file
