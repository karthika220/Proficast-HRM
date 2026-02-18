# Employee Activity Implementation

This document explains the Employee Activity feature implementation using database seed + live fallback.

## Overview

The Employee Activity page always shows data - starting with dummy seeded data and automatically replacing it with live attendance data when available.

## Database Schema

### New Table: `employee_activity`

```sql
CREATE TABLE "employee_activity" (
    "id" SERIAL NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "breakMinutes" INTEGER DEFAULT 0,
    "workingMinutes" INTEGER DEFAULT 0,
    "overtimeMinutes" INTEGER DEFAULT 0,
    "status" TEXT DEFAULT 'Present',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "employee_activity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "employee_activity_employeeId_date_key" 
ON "employee_activity"("employeeId", "date");
```

## Backend Implementation

### 1. Employee Activity Service (`src/services/employeeActivityService.js`)

- **seedEmployeeActivity()**: Creates dummy data for last 7 days (weekdays only)
- **upsertTodayActivity()**: Updates today's record with live attendance data
- **getEmployeeActivity()**: Returns live data if available, otherwise seeded data

### 2. Controller Updates

- **Employee Creation**: Automatically seeds 7 days of dummy activity data
- **Check-in**: Upserts today's activity record with check-in time
- **Check-out**: Upserts today's activity record with complete attendance data

### 3. API Endpoint

```
GET /api/employees/:id/activity
```

**Security:**
- MD/HR: Full access to all employees
- Manager: Only reporting employees
- Employee: Only self (using `employeeId === 'me'`)

## Frontend Implementation

### EmployeeActivity Component

- Calls API `/employees/:id/activity`
- Never shows error messages to user
- Always displays data (live or seeded)
- Shows comprehensive activity view with:
  - Employee profile card
  - Today's attendance
  - Activity summary cards
  - Attendance history table
  - Leave history table

## Setup Instructions

### 1. Run Database Migration

```bash
cd backend
npx prisma migrate dev
```

### 2. Seed Existing Employees

```bash
npm run seed:activity
```

### 3. Start Backend

```bash
npm run dev
```

## Data Flow

1. **New Employee**: Gets 7 days of seeded dummy activity data
2. **Daily Check-in**: Live data replaces seeded data for that day
3. **Activity Page**: Always shows data (seeded → live transition)

## Dummy Data Generation

- **Check-in**: 8:45 AM - 9:30 AM (random)
- **Check-out**: 5:30 PM - 7:00 PM (random)
- **Break**: 45-75 minutes (random)
- **Status**: Present/Late (based on check-in time)
- **Overtime**: Calculated if checkout after 6:45 PM
- **Weekends**: Skipped (no data for Saturday/Sunday)

## Security & Access Control

- Role-based access validation at backend
- Managers can only see reporting employees
- Employees can only see their own data
- All API calls require authentication

## Key Features

✅ **Always Shows Data**: No "failed to fetch" messages  
✅ **Live Override**: Real attendance replaces dummy data  
✅ **Database Storage**: Dummy data stored in DB (not frontend)  
✅ **Role-based Security**: Proper access control  
✅ **Automatic Seeding**: New employees get dummy data instantly  
✅ **Backward Compatibility**: Existing UI unchanged  

## Files Modified

### Backend
- `prisma/schema.prisma` - Added EmployeeActivity model
- `src/services/employeeActivityService.js` - New service
- `src/controllers/employeeController.js` - Updated with seeding + API
- `src/controllers/attendanceController.js` - Updated to upsert activity
- `src/routes/employeeRoutes.js` - Added activity route
- `package.json` - Added seeding script

### Frontend
- `src/components/EmployeeActivity.jsx` - Updated with fallback logic
- `src/pages/Employees.jsx` - View Activity button for HR/MD/Manager

### Database
- `prisma/migrations/20260216110000_create_employee_activity/` - New table

## Testing

1. Create a new employee → Should see 7 days of dummy activity
2. Check-in the employee → Today's data becomes live
3. Check-out the employee → Complete live data for today
4. View Activity page → Should show mixed live + seeded data
