const axios = require('axios');

// Test multiple check-ins and checkouts
async function testMultipleSessions() {
  console.log('Testing multiple check-in sessions...');
  
  try {
    // Login first
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'hr@example.com',
      password: 'hr123'
    });
    
    const token = loginRes.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    
    console.log('✅ Login successful');
    
    // First check-in
    const checkIn1 = await axios.post('http://localhost:5000/api/attendance/checkin', {}, { headers });
    console.log('✅ First check-in:', new Date(checkIn1.data.attendance.checkIn).toLocaleTimeString());
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // First checkout (break)
    const checkOut1 = await axios.post('http://localhost:5000/api/attendance/checkout', {
      checkoutType: 'BREAK',
      breakType: 'LUNCH'
    }, { headers });
    console.log('✅ First checkout (break):', new Date(checkOut1.data.checkOut).toLocaleTimeString());
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Second check-in (resume)
    const checkIn2 = await axios.post('http://localhost:5000/api/attendance/checkin', {}, { headers });
    console.log('✅ Second check-in (resume):', new Date(checkIn2.data.attendance.checkIn).toLocaleTimeString());
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Final checkout
    const checkOut2 = await axios.post('http://localhost:5000/api/attendance/checkout', {
      checkoutType: 'FINAL'
    }, { headers });
    console.log('✅ Final checkout:', new Date(checkOut2.data.checkOut).toLocaleTimeString());
    
    // Get today's attendance
    const todayRes = await axios.get('http://localhost:5000/api/attendance/today', { headers });
    console.log('✅ Today\'s sessions:', todayRes.data.length || 'Single record');
    
    if (Array.isArray(todayRes.data)) {
      todayRes.data.forEach((session, index) => {
        console.log(`Session ${index + 1}:`, {
          checkIn: session.checkIn ? new Date(session.checkIn).toLocaleTimeString() : 'N/A',
          checkOut: session.checkOut ? new Date(session.checkOut).toLocaleTimeString() : 'N/A',
          workingMinutes: session.workingMinutes || 0,
          breakMinutes: session.breakMinutes || 0,
          overtimeHours: session.overtimeHours || 0
        });
      });
    }
    
    console.log('✅ Multiple session test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testMultipleSessions();
