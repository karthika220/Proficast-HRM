# PeopleCore — Backend Integration Guide
## Using Cursor AI to Connect Frontend ↔ Backend

Based on your project structure: `Profitcast HRM` with `backend/` (Node/Prisma/Express) and `frontend/` (React/Vite)

---

## STEP 1 — Tell Cursor Your Stack

Open Cursor, press `Ctrl+Shift+L` to open a new Agent session, then paste this as your first message:

```
@codebase I am building an HR platform called PeopleCore.
Backend: Node.js + Express + Prisma ORM (PostgreSQL)
Frontend: React + Vite, using Axios at src/api/axios.js
I need you to help me integrate the frontend UI with backend API endpoints.
My backend runs on port 3000, frontend on port 3001.
```

This gives Cursor full context of your project before you start issuing commands.

---

## STEP 2 — Set Up Axios Base URL

In Cursor Agent, type:

```
Edit /frontend/src/api/axios.js to set baseURL to http://localhost:3000/api
and add a request interceptor that attaches the JWT token from localStorage
to every request as Authorization: Bearer <token>
```

Cursor will generate:

```js
// frontend/src/api/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

---

## STEP 3 — Connect the Login Page

In Cursor Agent:

```
In /frontend/src/pages/Login.jsx, replace the mock login with a real call:
POST /api/auth/login with { email, password }
Store the returned JWT in localStorage as 'token'
Store the user object in context
Redirect to /dashboard on success
Show error message on failure
```

---

## STEP 4 — Connect the Employees Page

In Cursor Agent:

```
In /frontend/src/pages/Employees.jsx, fetch employees from GET /api/employees
on component mount using Axios. Show a loading spinner while fetching.
Map the response to the employee list UI. 
Add a POST /api/employees call when the "+ Add Employee" button is clicked.
Use the existing Prisma Employee model.
```

---

## STEP 5 — Connect Attendance (Check-In / Check-Out)

In Cursor Agent:

```
In the Attendance component, wire the "Check In" button to POST /api/attendance/checkin
and "Check Out" to POST /api/attendance/checkout
Both calls should send { employeeId } from the logged-in user context.
Show the server-returned timestamp on success.
Block double check-in by checking if today's record already exists via GET /api/attendance/today
```

---

## STEP 6 — Connect Leave Management

In Cursor Agent:

```
Wire the leave application form to POST /api/leave/apply with:
{ employeeId, leaveType, fromDate, toDate, reason }

Wire the approve/reject buttons to:
PATCH /api/leave/:id/approve
PATCH /api/leave/:id/reject
Both should include { comment } in the body.

Fetch all leave requests from GET /api/leave?status=pending for the HR dashboard.
```

---

## STEP 7 — Protect Routes by Tier

In Cursor Agent:

```
Create a ProtectedRoute component in /frontend/src/components/ProtectedRoute.jsx
It should:
1. Read the user from context
2. Accept a prop 'minTier' (1=MD, 2=HR, 3=Manager, 4=Employee)
3. Redirect to /unauthorized if user.tier > minTier
Use this to wrap the Reports page (minTier=2) and Settings page (minTier=2)
```

---

## STEP 8 — Verify with the Existing Test Files

Your backend already has test files. Run them to confirm everything works:

```bash
# In your backend terminal:
node test-employees.js
node test-attendance.js
```

In Cursor, you can also type:

```
@terminal Run the test-attendance.js file and show me the output
```

---

## STEP 9 — Environment Variables

In Cursor Agent:

```
Check /backend/.env and make sure the following are set:
DATABASE_URL=postgresql://user:password@localhost:5432/peoplecore
JWT_SECRET=your_secret_key
PORT=3000

Then update /frontend/vite.config.js to proxy /api calls to http://localhost:3000
so I don't need CORS issues in development
```

Cursor will add to `vite.config.js`:

```js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    }
  }
}
```

---

## STEP 10 — Ask Cursor to Wire Everything End-to-End

Once individual steps are done, use this power prompt in Cursor:

```
@codebase Do a full audit of all frontend components in /frontend/src/pages
and /frontend/src/components. For any component that still uses hardcoded
mock data instead of a real API call, list the component name and the API
endpoint it should connect to based on the backend routes in /backend/src.
Then fix each one.
```

---

## Quick Cursor Tips for This Project

| Action | Cursor Command |
|---|---|
| Generate a Prisma model | `Create a Prisma schema for LeaveRequest with fields: id, employeeId, type, fromDate, toDate, status, reason, managerId, comment` |
| Add an API route | `Add a GET /api/attendance/monthly/:employeeId route that returns grouped attendance data for the month` |
| Debug a failing call | `@terminal The POST /api/leave/apply is returning 400. Check the validation in the route handler and fix it` |
| Add role middleware | `Create an Express middleware requireRole(tier) that rejects requests if req.user.tier > tier` |
| Run Prisma migrations | `@terminal Run prisma migrate dev --name add_leave_table` |

---

## API Endpoint Reference (for Cursor prompts)

```
Auth:
  POST   /api/auth/login
  POST   /api/auth/logout

Employees:
  GET    /api/employees
  GET    /api/employees/:id
  POST   /api/employees
  PATCH  /api/employees/:id
  DELETE /api/employees/:id

Attendance:
  POST   /api/attendance/checkin
  POST   /api/attendance/checkout
  GET    /api/attendance/today
  GET    /api/attendance/monthly/:employeeId
  GET    /api/attendance/summary        (HR/MD only)

Leave:
  GET    /api/leave
  GET    /api/leave/my
  POST   /api/leave/apply
  PATCH  /api/leave/:id/approve
  PATCH  /api/leave/:id/reject
  GET    /api/leave/balance/:employeeId
```

---

*PeopleCore v1.0 — Built for your agency*
