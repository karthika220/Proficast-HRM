# PeopleCore HR Platform - Frontend-Backend Integration Guide

## Overview
This document provides a comprehensive guide to the frontend-backend API integration for the PeopleCore HR Platform built with React + Vite frontend and Node.js + Express + Prisma backend.

**Backend Server:** `http://localhost:3000` (API base: `http://localhost:3000/api`)  
**Frontend Server:** `http://localhost:3001`

---

## Architecture

### Frontend Setup
- **Framework:** React 18 with Vite
- **HTTP Client:** Axios configured in [src/api/axios.js](frontend/src/api/axios.js)
- **State Management:** React Context (UserContext)
- **Routing:** React Router v6

### Backend Setup
- **Framework:** Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT tokens
- **Middleware:** Authentication middleware for protected routes

---

## API Configuration

### Axios Setup ([frontend/src/api/axios.js](frontend/src/api/axios.js))

```javascript
const api = axios.create({
  baseURL: "http://localhost:3000/api",
});

// Automatically attaches JWT token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handles 401 errors by clearing auth and redirecting
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);
```

---

## Authentication API

### Register New User
**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "secure_password",
  "phone": "+1234567890",
  "department": "Engineering",
  "designation": "Senior Developer",
  "role": "EMPLOYEE"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "EMPLOYEE",
    "tier": 4
  }
}
```

### Login
**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "secure_password"
}
```

**Response:** Same as Register

---

## Employee Management API

### Get All Employees
**Endpoint:** `GET /api/employees`

**Authorization:** Required  
**Access Control:** 
- HR/MD: See all employees
- Manager: See direct reports only
- Employee: See own record only

**Response:**
```json
{
  "count": 5,
  "employees": [
    {
      "id": "emp_1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "EMPLOYEE",
      "department": "Engineering",
      "tier": 4
    }
  ]
}
```

### Get Employee by ID
**Endpoint:** `GET /api/employees/:id`

**Authorization:** Required

### Create New Employee
**Endpoint:** `POST /api/employees`

**Authorization:** Required (HR only)

**Request Body:**
```json
{
  "fullName": "Jane Smith",
  "employeeId": "EMP001",
  "email": "jane@example.com",
  "password": "temp_password",
  "phone": "+1234567890",
  "role": "MANAGER",
  "department": "Sales",
  "designation": "Sales Manager",
  "dateOfJoining": "2024-01-15"
}
```

### Update Employee
**Endpoint:** `PUT /api/employees/:id`

**Authorization:** Required (HR only)

### Archive Employee
**Endpoint:** `DELETE /api/employees/:id`

**Authorization:** Required (HR only)

---

## Attendance API

### Check In
**Endpoint:** `POST /api/attendance/checkin`

**Authorization:** Required

**Request Body:** Send empty object or no body

**Response:**
```json
{
  "message": "Checked in successfully",
  "attendance": {
    "id": "att_1",
    "date": "2024-02-14",
    "checkIn": "2024-02-14T09:15:00Z",
    "status": "Present"
  }
}
```

**Status Determination:**
- Before 9:10 AM → "Present"
- 9:10 AM - 1:00 PM → "Late"
- After 1:00 PM → "HalfDay"

### Check Out
**Endpoint:** `POST /api/attendance/checkout`

**Authorization:** Required

**Request Body:** Send empty object or no body

**Response:**
```json
{
  "message": "Checked out successfully",
  "attendance": {
    "id": "att_1",
    "date": "2024-02-14",
    "checkIn": "2024-02-14T09:15:00Z",
    "checkOut": "2024-02-14T18:30:00Z",
    "status": "Present"
  }
}
```

**Additional Status Rules:**
- Check-out before 6:45 PM → "Early" (overrides other statuses)

### Get Today's Attendance
**Endpoint:** `GET /api/attendance/today`

**Authorization:** Required

**Response:**
```json
{
  "date": "2024-02-14",
  "status": "Present",
  "checkIn": "2024-02-14T09:15:00Z",
  "checkOut": "2024-02-14T18:30:00Z"
}
```

### Get My Attendance Records
**Endpoint:** `GET /api/attendance/my?limit=30&offset=0`

**Authorization:** Required

**Query Parameters:**
- `limit` (optional): Number of records to return (default: 30)
- `offset` (optional): Number of records to skip (default: 0)

**Response:**
```json
{
  "count": 30,
  "attendances": [
    {
      "id": "att_1",
      "date": "2024-02-14",
      "checkIn": "2024-02-14T09:15:00Z",
      "checkOut": "2024-02-14T18:30:00Z",
      "status": "Present"
    }
  ]
}
```

### Get Monthly Attendance
**Endpoint:** `GET /api/attendance/monthly?month=2&year=2024&employeeId=emp_1`

**Authorization:** Required

**Query Parameters:**
- `month` (optional): Month number 1-12
- `year` (optional): Year (default: current year)
- `employeeId` (optional): For HR/MD/Manager to view others' attendance

**Access Control:**
- HR/MD: Can view any employee
- Manager: Can view direct reports only
- Employee: Can only view own

**Response:**
```json
{
  "month": 2,
  "year": 2024,
  "statistics": {
    "totalDays": 20,
    "present": 18,
    "late": 1,
    "absent": 1,
    "halfDay": 0,
    "early": 0
  },
  "attendances": [
    {
      "id": "att_1",
      "date": "2024-02-01",
      "checkIn": "2024-02-01T09:15:00Z",
      "checkOut": "2024-02-01T18:30:00Z",
      "status": "Present"
    }
  ]
}
```

### Get Attendance Summary
**Endpoint:** `GET /api/attendance/summary?startDate=2024-02-01&endDate=2024-02-14`

**Authorization:** Required

**Query Parameters:**
- `startDate` (optional): Start date YYYY-MM-DD
- `endDate` (optional): End date YYYY-MM-DD

**Response:**
```json
[
  {
    "date": "2024-02-14",
    "total": 50,
    "present": 45,
    "absent": 3,
    "late": 2,
    "onLeave": 0
  }
]
```

---

## Leave Management API

### Apply for Leave
**Endpoint:** `POST /api/leave/apply`

**Authorization:** Required

**Request Body:**
```json
{
  "type": "CL",
  "fromDate": "2024-03-01",
  "toDate": "2024-03-05",
  "days": 5,
  "reason": "Family vacation"
}
```

**Leave Types:**
- `CL` - Casual Leave
- `SL` - Sick Leave
- `UL` - Unpaid Leave

**Response:**
```json
{
  "id": "leave_1",
  "userId": "user_1",
  "type": "CL",
  "fromDate": "2024-03-01",
  "toDate": "2024-03-05",
  "days": 5,
  "reason": "Family vacation",
  "status": "PENDING"
}
```

### Get My Leave Requests
**Endpoint:** `GET /api/leave/my`

**Authorization:** Required

**Response:** Array of leave requests

### Get Leave Balance
**Endpoint:** `GET /api/leave/balance`

**Authorization:** Required

**Response:**
```json
{
  "casual": 8,
  "sick": 12
}
```

### Get All Leave Requests (with filtering)
**Endpoint:** `GET /api/leave?status=PENDING`

**Authorization:** Required

**Query Parameters:**
- `status` (optional): PENDING, APPROVED, REJECTED, or 'all' for all statuses

**Response:** Array of leave requests with user details

### Get Pending Leave Requests
**Endpoint:** `GET /api/leave/pending`

**Authorization:** Required

**Response:** Array of PENDING leave requests (for HR/Manager approval)

### Approve Leave (PATCH)
**Endpoint:** `PATCH /api/leave/:id/approve`

**Authorization:** Required (Manager/HR/MD)

**Request Body:**
```json
{
  "comment": "Approved"
}
```

**Approval Chain:**
1. **MANAGER** → approves first (approvedByManager = true)
2. **HR** → approves second (approvedByHR = true)
3. **MD** → final approval (approvedByMD = true, status = APPROVED)
4. Leave balance is deducted upon MD approval

### Reject Leave (PATCH)
**Endpoint:** `PATCH /api/leave/:id/reject`

**Authorization:** Required (Manager/HR/MD)

**Request Body:**
```json
{
  "comment": "Cannot approve at this time"
}
```

**Note:** Backwards compatibility support - both PATCH and POST work

---

## Dashboard API

### Get Dashboard Statistics
**Endpoint:** `GET /api/dashboard/stats`

**Authorization:** Required

**Response:**
```json
{
  "total": 50,
  "present": 45,
  "late": 2,
  "onLeave": 3,
  "absent": 0
}
```

### Get Today's Attendance Report
**Endpoint:** `GET /api/dashboard/today-attendance`

**Authorization:** Required

**Response:** Array of attendance records for today

---

## User Context ([frontend/src/context/UserContext.jsx](frontend/src/context/UserContext.jsx))

### Login Function
```javascript
const { login } = useContext(UserContext);
login(userData, token); // Stores in context and localStorage
```

### Logout Function
```javascript
const { logout } = useContext(UserContext);
logout(); // Clears context and localStorage
```

### User State
```javascript
const { user, token, isAuthenticated } = useContext(UserContext);
// user: { id, name, email, role, tier }
// token: JWT token string
// isAuthenticated: boolean
```

---

## Error Handling

### Standard Error Response
```json
{
  "error": "Error message",
  "details": "Additional details (if available)"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Server Error

### Automatic 401 Handling
The axios interceptor automatically:
1. Removes token from localStorage
2. Removes user from localStorage
3. Redirects to login page

---

## Frontend Components using APIs

### Pages with API Integration

| Page | File | Key Endpoints |
|------|------|---|
| Login | [pages/Login.jsx](frontend/src/pages/Login.jsx) | POST /auth/login |
| Register | [pages/Register.jsx](frontend/src/pages/Register.jsx) | POST /auth/register |
| Dashboard | [pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx) | GET /employees, POST /attendance/checkin, POST /attendance/checkout, GET /leave?status=PENDING |
| Employees | [pages/Employees.jsx](frontend/src/pages/Employees.jsx) | GET /employees, POST /employees, PUT /employees/:id, DELETE /employees/:id |
| Attendance | [pages/Attendance.jsx](frontend/src/pages/Attendance.jsx) | POST /attendance/checkin, POST /attendance/checkout, GET /attendance/today, GET /attendance/monthly |
| Leave | [pages/Leave.jsx](frontend/src/pages/Leave.jsx) | POST /leave/apply, GET /leave/balance, GET /leave/my, PATCH /leave/:id/approve, PATCH /leave/:id/reject |
| HRDashboard | [pages/HRDashboard.jsx](frontend/src/pages/HRDashboard.jsx) | GET /dashboard/stats, GET /employees, GET /leave?status=PENDING |
| Reports | [pages/Reports.jsx](frontend/src/pages/Reports.jsx) | GET /attendance/summary, GET /leave, GET /employees |

---

## Role-Based Access Control

### User Roles and Tiers
- **MD (Managing Director)** - Tier 1: Full access to all features
- **HR (Human Resources)** - Tier 2: HR operations and reporting
- **MANAGER** - Tier 3: Team management and approvals
- **EMPLOYEE** - Tier 4: Limited access (own records only)

### Protected Routes
- All authenticated routes require valid JWT token
- Role-based access is enforced via middleware on backend
- Frontend uses ProtectedRoute component with minTier prop

---

## Testing Backend Endpoints

### Using curl or Postman

1. **Login and get token:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

2. **Use token in subsequent requests:**
```bash
curl -X GET http://localhost:3000/api/attendance/today \
  -H "Authorization: Bearer <token_from_login>"
```

### Testing Files
Refer to the following test files for examples:
- [backend/test-employees.js](backend/test-employees.js)
- [backend/test-attendance.js](backend/test-attendance.js)
- [backend/HOW_TO_TEST.md](backend/HOW_TO_TEST.md)

---

## Development Workflow

### Starting Development Servers

1. **Start Backend:**
```bash
cd backend
npm install
npm run dev
```
Backend will run on `http://localhost:3000`

2. **Start Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Frontend will run on `http://localhost:3001`

### Environment Setup

**Backend (.env):**
```
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/profitcast_hrm
JWT_SECRET=your_jwt_secret_here
NODE_ENV=development
```

**Frontend (.env):**
```
VITE_API_BASE_URL=http://localhost:3000/api
```

---

## CORS Configuration

The backend has CORS enabled for development:
```javascript
app.use(cors()); // Allows all origins
```

For production, configure CORS with specific origins in backend/src/server.js

---

## Best Practices

1. **Always attach authorization header** - Axios interceptor handles this automatically
2. **Validate input on frontend** before sending to backend
3. **Handle loading states** for better UX
4. **Show meaningful error messages** to users
5. **Use proper HTTP methods**:
   - GET: Retrieve data
   - POST: Create data
   - PUT: Update full record
   - PATCH: Update specific fields (also used in this API)
   - DELETE: Remove data
6. **Cache API responses** where appropriate to reduce unnecessary requests

---

## Troubleshooting

### "Cannot GET /api/..." errors
- Ensure backend is running on port 3000
- Check that the API route is defined in backend routes

### 401 Unauthorized errors
- Token might be expired
- Token not being sent in Authorization header
- Check localStorage for valid token

### CORS errors
- Ensure the request is going to correct API URL
- Backend CORS is enabled for development

### Database connection errors
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Run migrations: `npx prisma migrate deploy`

---

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Express.js Guide](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Axios Documentation](https://axios-http.com/)
- Swagger/OpenAPI docs (if available)

---

## Summary of Fixed Issues

1. ✅ **Leave API endpoints** - Now support both PATCH and POST for approve/reject, added `/balance` and query parameter filtering
2. ✅ **Attendance endpoints** - Added `/today` and `/summary` endpoints
3. ✅ **Auth registration** - Now supports both `name` and `fullName` fields
4. ✅ **Frontend API calls** - Updated to correct endpoints and field names
5. ✅ **Query parameters** - Leave endpoints now properly handle `?status=` filtering

---

**Last Updated:** February 14, 2026  
**Platform:** PeopleCore HR Platform v1.0
