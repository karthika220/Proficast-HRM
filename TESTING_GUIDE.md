# 🚀 End-to-End Testing Guide

## Prerequisites
- Backend running on `http://localhost:3000`
- Frontend running on `http://localhost:3001`
- PostgreSQL database connected (Supabase)

---

## Test Scenario 1: Dashboard Navigation & Check-In

### Steps:
1. Go to `http://localhost:3001` and login with:
   - Email: `md@example.com`
   - Password: `Password123`

2. Verify you see the Dashboard with:
   - Welcome message with your name
   - 4 stat cards (Present/Late/OnLeave/Absent)
   - Today's attendance list
   - Leave balance cards
   - Quick actions button group

3. Click **"👤 View Profile"** 
   - ✅ Should navigate to Settings page

4. Go back to Dashboard

5. Click **"📊 View Reports"**
   - ✅ Should navigate to Reports page

6. Go back to Dashboard

7. Click **"⏹ Check Out"** (if you've checked in) or **"▶ Check In Now"**
   - ✅ Button should show "Processing..."
   - ✅ Success notification should appear: "✓ Check-in recorded"
   - ✅ Real-time clock should display current time
   - ✅ Button should change state

8. Click **"📋 Apply Leave"**
   - ✅ Should navigate to Leave page

---

## Test Scenario 2: Employee Management

### Steps:
1. Navigate to Employees page

2. Verify you see:
   - Employee count
   - **"👥 Add Employee"** button
   - Employee list with search/filter

3. Click **"👥 Add Employee"** button
   - ✅ Form should expand
   - ✅ Button text changes to "Cancel"

4. Try submitting empty form
   - ✅ Should show validation error: "Please fill in all required fields"

5. Fill the form with:
   - Employee ID: `EMP002`
   - Full Name: `John Smith`
   - Email: `john@example.com`
   - Password: `Test1234`
   - Phone: `9876543210`
   - Department: `Sales`
   - Designation: `Sales Executive`
   - Role: `EMPLOYEE`

6. Click "💼 Submit" (or similar button)
   - ✅ Success notification: "✓ Employee added successfully!"
   - ✅ Form should clear
   - ✅ New employee appears in the list
   - ✅ Form should collapse

7. Search for the new employee
   - ✅ Should find and display the employee

---

## Test Scenario 3: Leave Request

### Steps:
1. Navigate to Leave page

2. Verify you see:
   - Leave balance cards (Casual & Sick)
   - **"📋 New Request"** button
   - Your leave requests list

3. Click **"📋 New Request"** button
   - ✅ Form should expand with fields:
     - Leave Type dropdown
     - Start Date picker
     - End Date picker
     - Reason textarea
     - Submit button

4. Try submitting without dates
   - ✅ Should show validation error

5. Fill the form:
   - Leave Type: Select `🏖️ Casual Leave (CL)`
   - Start Date: Select tomorrow's date
   - End Date: Select day after tomorrow
   - Reason: "Personal reasons"

6. Click **"✓ Submit Request"**
   - ✅ Button should show "Submitting..."
   - ✅ Success notification: "✓ Leave request submitted successfully!"
   - ✅ Form should clear and collapse
   - ✅ Request should appear in "Your Leave Requests" section

7. Verify request status shows as "Pending"

8. (If HR/MD account) Scroll to "Pending Leave Requests" section
   - ✅ Your request should appear
   - ✅ **"✓ Approve"** and **"✗ Reject"** buttons available
   - ✅ Comment textarea available

---

## Test Scenario 4: Settings & Profile

### Steps:
1. Navigate to Settings page

2. Verify you see two cards:
   - Profile Information (with Full Name, Email, Phone fields)
   - Change Password section

3. Update profile:
   - Change Full Name to: `MD User Updated`
   - Change Phone to: `9999999999`
   - Click **"💾 Save Profile"**
     - ✅ Button shows "Saving..."
     - ✅ Success notification appears
     - ✅ Fields retain your values

4. Reload the page
   - ✅ Updated profile data persists

5. Change password:
   - Current Password: `Password123`
   - New Password: `NewPass123` (min 6 chars)
   - Confirm Password: `NewPass123`
   - Click **"🔐 Update Password"**
     - ✅ Button shows "Updating..."
     - ✅ Success notification appears
     - ✅ Form clears

6. Try invalid password change:
   - Fill with mismatched confirm password
   - ✅ Should show validation error

---

## Test Scenario 5: Reports

### Steps:
1. Navigate to Reports page

2. Verify report controls:
   - Report Type dropdown
   - (For Attendance) Start Date and End Date pickers
   - **"📋 Generate Report"** button

3. Select "📅 Attendance Summary"
   - Set Start Date: 30 days ago
   - Set End Date: Today
   - Click **"📋 Generate Report"**
     - ✅ Button shows "Loading..."
     - ✅ Report data displays
     - ✅ Shows stats: Total Present, Total Absent, Total Leave

4. Verify **"📥 Export Data"** button appears
   - ✅ Click to download CSV file
   - ✅ File downloads with name: `report-attendance-[timestamp].csv`

5. Select "🏖️ Leave Requests"
   - Click **"📋 Generate Report"**
     - ✅ Table displays with columns: Employee, Type, Period, Status
     - ✅ Your leave request appears
     - ✅ Status shows correctly

6. Select "👥 Employee Directory"
   - Click **"📋 Generate Report"**
     - ✅ Table displays all employees
     - ✅ Columns: Name, Email, Department, Designation, Role
     - ✅ New employee from Scenario 2 appears

---

## Test Scenario 6: Button Styling & Responsiveness

### Desktop View (Full Width):
1. All buttons should be visible and clickable
2. Buttons should have proper hover effects (slight lift/shadow)
3. Forms should display in responsive grid

### Tablet View (≤1024px):
1. Resize browser to 1024px width
2. Verify:
   - Grid layout reduces to 2 columns where applicable
   - Buttons remain clickable
   - Forms remain visible

### Mobile View (≤768px):
1. Resize browser to 768px or smaller
2. Verify:
   - Grid layout becomes 1 column
   - Buttons remain full-width or properly sized
   - Forms stack vertically
   - Navigation still works

---

## Error Handling Tests

### Network Error Test:
1. Temporarily stop backend server
2. Try to perform any API action
3. ✅ Should show appropriate error message
4. Restart backend server

### Validation Test:
1. Try to add employee with invalid email: `notanemail`
   - ✅ Should show: "Please enter a valid email address"

2. Try to add employee with short password: `abc`
   - ✅ Should show: "Password must be at least 6 characters"

3. Try to add employee with email in ID: `user@domain`
   - ✅ Should show: "Employee ID should not be an email address"

---

## Performance Tests

### Load Time:
1. Measure time from page navigation to full rendering
   - ✅ Should be < 2 seconds for most pages
   - ✅ Loading spinner should show during data fetch

### Button Response:
1. Click buttons and verify immediate visual feedback
   - ✅ Button changes appearance instantly
   - ✅ Loading state shows within 200ms
   - ✅ Success notification appears within 500ms

### Form Submission:
1. Submit forms and measure end-to-end time
   - ✅ Should complete within 3-5 seconds
   - ✅ Notification auto-dismisses after 3 seconds

---

## Accessibility Tests

### Keyboard Navigation:
1. Press Tab to navigate through all buttons
   - ✅ All buttons should be focusable
   - ✅ Focus indicator should be visible

2. Press Enter on focused buttons
   - ✅ Buttons should activate (click)

3. Press Escape in modals/forms
   - ✅ Forms should close where applicable

### Color & Contrast:
1. Verify all text is readable on backgrounds:
   - ✅ Success notifications (green) readable
   - ✅ Error notifications visually distinct
   - ✅ Buttons have sufficient contrast

---

## Final Verification Checklist

- [ ] All Dashboard buttons functional (View Profile, Apply Leave, View Reports, Settings, Check-In/Out)
- [ ] Employees: Add Employee button works with form validation
- [ ] Attendance: Check-In/Out buttons record timestamps
- [ ] Leave: Request button shows form, Submit works, approval buttons visible for HR/MD
- [ ] Settings: Save Profile and Update Password buttons work
- [ ] Reports: Generate Report and Export buttons functional
- [ ] Notifications display and auto-dismiss
- [ ] Responsive design works on desktop, tablet, mobile
- [ ] Keyboard navigation works
- [ ] Error handling shows appropriate messages
- [ ] API integration complete (all endpoints responding)
- [ ] JWT authentication working
- [ ] Database persists all changes

---

## Quick Test Command

Once both servers are running, test all pages:
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
cd frontend && npm run dev

# Open browser
http://localhost:3001
```

---

**🎉 All features are ready for production testing!**
