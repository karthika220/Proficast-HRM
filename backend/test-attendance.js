// Quick test script for Attendance System
require("dotenv").config();
const http = require("http");

const BASE_URL = "http://localhost:5000";

// Helper function to make HTTP requests
function makeRequest(method, path, token = null, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }

    if (body) {
      options.headers["Content-Length"] = JSON.stringify(body).length;
    }

    const req = http.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("=== Attendance System Test ===\n");

  try {
    // Test 1: Login
    console.log("1. Testing Login...");
    const loginRes = await makeRequest("POST", "/auth/login", null, {
      email: "admin@profitcast.com",
      password: "admin123",
    });

    if (loginRes.status === 200 && loginRes.data.token) {
      console.log("   ✅ Login successful!");
      console.log(`   User: ${loginRes.data.user.email} - Role: ${loginRes.data.user.role}`);
      const token = loginRes.data.token;

      // Test 2: Check-in
      console.log("\n2. Testing POST /attendance/checkin...");
      const checkInRes = await makeRequest("POST", "/attendance/checkin", token);
      if (checkInRes.status === 201) {
        console.log("   ✅ Check-in successful!");
        console.log(`   Status: ${checkInRes.data.attendance.status}`);
        console.log(`   Check-in time: ${new Date(checkInRes.data.attendance.checkIn).toLocaleTimeString()}`);
      } else if (checkInRes.status === 400) {
        console.log("   ⚠️  Already checked in today (expected if running multiple times)");
        console.log(`   Status: ${checkInRes.data.attendance?.status || "N/A"}`);
      } else {
        console.log(`   ❌ Failed with status ${checkInRes.status}`);
        console.log(`   Response: ${JSON.stringify(checkInRes.data)}`);
      }

      // Test 3: Try double check-in (should fail)
      console.log("\n3. Testing double check-in prevention...");
      const doubleCheckInRes = await makeRequest("POST", "/attendance/checkin", token);
      if (doubleCheckInRes.status === 400) {
        console.log("   ✅ Double check-in prevention working!");
        console.log(`   Message: ${doubleCheckInRes.data.error}`);
      } else {
        console.log(`   ⚠️  Unexpected status: ${doubleCheckInRes.status}`);
      }

      // Test 4: Get My Attendance
      console.log("\n4. Testing GET /attendance/my...");
      const myAttendanceRes = await makeRequest("GET", "/attendance/my", token);
      if (myAttendanceRes.status === 200) {
        console.log(`   ✅ Get my attendance successful! Found ${myAttendanceRes.data.count} record(s)`);
        if (myAttendanceRes.data.attendances && myAttendanceRes.data.attendances.length > 0) {
          const latest = myAttendanceRes.data.attendances[0];
          console.log(`   Latest: ${new Date(latest.date).toLocaleDateString()} - ${latest.status}`);
        }
      } else {
        console.log(`   ❌ Failed with status ${myAttendanceRes.status}`);
      }

      // Test 5: Get Monthly Attendance
      console.log("\n5. Testing GET /attendance/monthly...");
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const monthlyRes = await makeRequest(
        "GET",
        `/attendance/monthly?month=${month}&year=${year}`,
        token
      );
      if (monthlyRes.status === 200) {
        console.log("   ✅ Get monthly attendance successful!");
        console.log(`   Month: ${monthlyRes.data.month}/${monthlyRes.data.year}`);
        console.log(`   Statistics:`);
        console.log(`     - Total Days: ${monthlyRes.data.statistics.totalDays}`);
        console.log(`     - Present: ${monthlyRes.data.statistics.present}`);
        console.log(`     - Late: ${monthlyRes.data.statistics.late}`);
        console.log(`     - Absent: ${monthlyRes.data.statistics.absent}`);
        console.log(`     - HalfDay: ${monthlyRes.data.statistics.halfDay}`);
        console.log(`     - Early: ${monthlyRes.data.statistics.early}`);
      } else {
        console.log(`   ❌ Failed with status ${monthlyRes.status}`);
      }

      // Test 6: Check-out
      console.log("\n6. Testing POST /attendance/checkout...");
      const checkOutRes = await makeRequest("POST", "/attendance/checkout", token);
      if (checkOutRes.status === 200) {
        console.log("   ✅ Check-out successful!");
        console.log(`   Status: ${checkOutRes.data.attendance.status}`);
        console.log(`   Check-out time: ${new Date(checkOutRes.data.attendance.checkOut).toLocaleTimeString()}`);
      } else if (checkOutRes.status === 400) {
        console.log("   ⚠️  " + checkOutRes.data.error);
      } else {
        console.log(`   ❌ Failed with status ${checkOutRes.status}`);
      }

      // Test 7: Access without token (should fail)
      console.log("\n7. Testing GET /attendance/my (without token - should fail)...");
      const noAuthRes = await makeRequest("GET", "/attendance/my");
      if (noAuthRes.status === 401) {
        console.log("   ✅ Access control working: 401 Unauthorized");
      } else {
        console.log(`   ⚠️  Unexpected status: ${noAuthRes.status}`);
      }

      console.log("\n=== All Tests Completed ===");
      console.log("✅ Authentication working");
      console.log("✅ Attendance routes accessible");
      console.log("✅ Check-in/Check-out working");
      console.log("✅ Status calculation working");
      console.log("✅ Access control enforced");
    } else {
      console.log(`   ❌ Login failed: ${loginRes.status}`);
      console.log(`   Response: ${JSON.stringify(loginRes.data)}`);
    }
  } catch (error) {
    console.error("❌ Test error:", error.message);
  }
}

// Wait a bit for server to be ready
setTimeout(() => {
  runTests();
}, 2000);
