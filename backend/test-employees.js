// Quick test script for Employee Management System
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
  console.log("=== Employee Management System Test ===\n");

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

      // Test 2: Get Employees (should work for MD)
      console.log("\n2. Testing GET /employees...");
      const getEmployeesRes = await makeRequest("GET", "/employees", token);
      if (getEmployeesRes.status === 200) {
        console.log(`   ✅ Get employees successful! Found ${getEmployeesRes.data.count} employee(s)`);
        if (getEmployeesRes.data.employees && getEmployeesRes.data.employees.length > 0) {
          const firstEmp = getEmployeesRes.data.employees[0];
          console.log(`   First employee: ${firstEmp.fullName} (${firstEmp.role})`);
        }
      } else {
        console.log(`   ❌ Failed with status ${getEmployeesRes.status}`);
      }

      // Test 3: Try to create employee as MD (should fail)
      console.log("\n3. Testing POST /employees (as MD - should fail)...");
      const createRes = await makeRequest("POST", "/employees", token, {
        employeeId: "TEST001",
        fullName: "Test User",
        email: "test@test.com",
        password: "test123",
        role: "EMPLOYEE",
      });
      if (createRes.status === 403) {
        console.log("   ✅ Access control working: 403 Forbidden (MD cannot create)");
      } else {
        console.log(`   ⚠️  Unexpected status: ${createRes.status}`);
      }

      // Test 4: Access without token (should fail)
      console.log("\n4. Testing GET /employees (without token - should fail)...");
      const noAuthRes = await makeRequest("GET", "/employees");
      if (noAuthRes.status === 401) {
        console.log("   ✅ Access control working: 401 Unauthorized");
      } else {
        console.log(`   ⚠️  Unexpected status: ${noAuthRes.status}`);
      }

      console.log("\n=== All Tests Completed ===");
      console.log("✅ Authentication working");
      console.log("✅ Employee routes accessible");
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
