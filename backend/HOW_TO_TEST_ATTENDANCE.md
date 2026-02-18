# How to Test Attendance System

## Quick Test (Automated)

Run the automated test script:

```bash
cd backend
node test-attendance.js
```

This will test:
- ✅ Login functionality
- ✅ Check-in endpoint
- ✅ Double check-in prevention
- ✅ Check-out endpoint
- ✅ Get my attendance
- ✅ Get monthly attendance with statistics
- ✅ Access control

---

## Manual Testing with Postman/Thunder Client

### Prerequisites

1. **Start the server:**
   ```bash
   cd backend
   npm start
   # or for development
   npm run dev
   ```

2. **Make sure you're logged in and have a token**

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

**Save the token** from the response!

---

### Step 2: Test Check-in

**Request:**
```
POST http://localhost:5000/attendance/checkin
Authorization: Bearer <your-token>
```

**Expected Response (201 Created):**
```json
{
  "message": "Checked in successfully",
  "attendance": {
    "id": "...",
    "date": "2024-12-02T00:00:00.000Z",
    "checkIn": "2024-12-02T09:05:00.000Z",
    "status": "Present"
  }
}
```

**Status Rules:**
- Check-in before 9:10 AM → `Present`
- Check-in after 9:10 AM → `Late`
- Check-in after 1:00 PM → `HalfDay`

**Test Cases:**
- ✅ First check-in → Should succeed
- ❌ Second check-in same day → Should fail (400 Bad Request)
- ✅ Check status matches time

---

### Step 3: Test Double Check-in Prevention

**Request:**
```
POST http://localhost:5000/attendance/checkin
Authorization: Bearer <your-token>
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "Already checked in for today",
  "attendance": {
    "id": "...",
    "checkIn": "...",
    "status": "Present"
  }
}
```

**✅ Test:** Try checking in twice - second attempt should fail

---

### Step 4: Test Check-out

**Request:**
```
POST http://localhost:5000/attendance/checkout
Authorization: Bearer <your-token>
```

**Expected Response (200 OK):**
```json
{
  "message": "Checked out successfully",
  "attendance": {
    "id": "...",
    "date": "2024-12-02T00:00:00.000Z",
    "checkIn": "2024-12-02T09:05:00.000Z",
    "checkOut": "2024-12-02T18:50:00.000Z",
    "status": "Present"
  }
}
```

**Status Rules:**
- Checkout before 6:45 PM → `Early` (overrides other statuses)
- Checkout after 6:45 PM → Keeps original status (Present/Late)

**Test Cases:**
- ✅ Check-out after check-in → Should succeed
- ❌ Check-out without check-in → Should fail (400 Bad Request)
- ❌ Double check-out → Should fail (400 Bad Request)

---

### Step 5: Get My Attendance

**Request:**
```
GET http://localhost:5000/attendance/my?limit=30&offset=0
Authorization: Bearer <your-token>
```

**Expected Response (200 OK):**
```json
{
  "count": 5,
  "attendances": [
    {
      "id": "...",
      "date": "2024-12-02T00:00:00.000Z",
      "checkIn": "2024-12-02T09:05:00.000Z",
      "checkOut": "2024-12-02T18:50:00.000Z",
      "status": "Present"
    }
  ]
}
```

**Query Parameters:**
- `limit` - Number of records (default: 30)
- `offset` - Skip records for pagination (default: 0)

---

### Step 6: Get Monthly Attendance

**Request:**
```
GET http://localhost:5000/attendance/monthly?month=12&year=2024
Authorization: Bearer <your-token>
```

**Expected Response (200 OK):**
```json
{
  "month": 12,
  "year": 2024,
  "statistics": {
    "totalDays": 22,
    "present": 18,
    "late": 2,
    "absent": 1,
    "halfDay": 0,
    "early": 1
  },
  "attendances": [
    {
      "id": "...",
      "date": "2024-12-02T00:00:00.000Z",
      "checkIn": "...",
      "checkOut": "...",
      "status": "Present"
    }
  ]
}
```

**Query Parameters:**
- `month` - Month number (1-12), defaults to current month
- `year` - Year (e.g., 2024), defaults to current year
- `employeeId` - (HR/MD only) View specific employee's attendance

**For HR/MD to view specific employee:**
```
GET http://localhost:5000/attendance/monthly?month=12&year=2024&employeeId=<employee-id>
Authorization: Bearer <your-token>
```

---

### Step 7: Test Access Control

**Request (without token):**
```
GET http://localhost:5000/attendance/my
(No Authorization header)
```

**Expected Response:** 401 Unauthorized

---

## Testing Status Calculation

### Test Present Status
1. Check-in before 9:10 AM
2. Check-out after 6:45 PM
3. **Expected:** Status = `Present`

### Test Late Status
1. Check-in after 9:10 AM (but before 1 PM)
2. Check-out after 6:45 PM
3. **Expected:** Status = `Late`

### Test HalfDay Status
1. Check-in after 1:00 PM
2. Check-out anytime
3. **Expected:** Status = `HalfDay`

### Test Early Status
1. Check-in anytime
2. Check-out before 6:45 PM
3. **Expected:** Status = `Early` (overrides Present/Late)

### Test Absent Status
1. Don't check-in
2. Wait until after 10:00 AM
3. Fetch monthly attendance
4. **Expected:** Status = `Absent` (auto-marked)

---

## Testing Checklist

- [ ] Server is running
- [ ] Can login and get token
- [ ] Can check-in successfully
- [ ] Cannot check-in twice (double prevention)
- [ ] Status calculated correctly based on time
- [ ] Can check-out successfully
- [ ] Cannot check-out without check-in
- [ ] Cannot check-out twice
- [ ] Can get my attendance records
- [ ] Can get monthly attendance with statistics
- [ ] Cannot access without token (401)
- [ ] HR/MD can view any employee's attendance
- [ ] Manager can view direct reports' attendance
- [ ] Employee can only view their own attendance

---

## Common Test Scenarios

### Scenario 1: Full Day Present
1. Check-in at 9:00 AM
2. Check-out at 7:00 PM
3. **Result:** Status = `Present`

### Scenario 2: Late Arrival
1. Check-in at 9:30 AM
2. Check-out at 7:00 PM
3. **Result:** Status = `Late`

### Scenario 3: Half Day
1. Check-in at 2:00 PM
2. Check-out at 7:00 PM
3. **Result:** Status = `HalfDay`

### Scenario 4: Early Leave
1. Check-in at 9:00 AM
2. Check-out at 6:00 PM
3. **Result:** Status = `Early`

### Scenario 5: Absent
1. Don't check-in
2. After 10:00 AM, fetch monthly attendance
3. **Result:** Status = `Absent` (auto-marked)

---

## Troubleshooting

**Issue: 401 Unauthorized**
- ✅ Check if token is included in Authorization header
- ✅ Format: `Authorization: Bearer <token>`
- ✅ Token might be expired - login again

**Issue: 400 Bad Request - Already checked in**
- ✅ This is expected - you can only check-in once per day
- ✅ Use check-out endpoint instead

**Issue: 400 Bad Request - No check-in found**
- ✅ You must check-in before checking out
- ✅ Check-in first, then check-out

**Issue: Status not updating**
- ✅ Status is calculated automatically
- ✅ Check-out updates status (e.g., Early)
- ✅ Wait until after 10 AM for Absent status

---

## Success Indicators

✅ **All working correctly if:**
- Check-in returns status based on time
- Cannot check-in twice
- Check-out updates status correctly
- Monthly attendance shows statistics
- Access control works (401 without token)
- Role-based access works (HR/MD see all, Manager sees reports, Employee sees self)

🎉 **Attendance System is working perfectly!**
