const axios = require('axios');

// Test complete multiple session workflow
async function testCompleteWorkflow() {
  console.log('Testing complete multiple session workflow...');
  
  try {
    // Login first
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'hr@example.com',
      password: 'hr123'
    });
    
    const token = loginRes.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    
    console.log('✅ Login successful');
    
    // Step 1: First check-in
    try {
      const checkIn1 = await axios.post('http://localhost:5000/api/attendance/checkin', {}, { headers });
      console.log('✅ First check-in:', new Date(checkIn1.data.attendance.checkIn).toLocaleTimeString());
    } catch (error) {
      console.log('ℹ️ Already checked in, continuing with workflow...');
    }
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Take a break
    const checkOut1 = await axios.post('http://localhost:5000/api/attendance/checkout', {
      checkoutType: 'BREAK',
      breakType: 'LUNCH'
    }, { headers });
    console.log('✅ Break started:', new Date(checkOut1.data.checkOut).toLocaleTimeString());
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 3: Resume work (check-in again)
    const checkIn2 = await axios.post('http://localhost:5000/api/attendance/checkin', {}, { headers });
    console.log('✅ Work resumed:', new Date(checkIn2.data.attendance.checkIn).toLocaleTimeString());
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 4: Final checkout
    const checkOut2 = await axios.post('http://localhost:5000/api/attendance/checkout', {
      checkoutType: 'FINAL'
    }, { headers });
    console.log('✅ Final checkout:', new Date(checkOut2.data.checkOut).toLocaleTimeString());
    
    // Get today's attendance to see all sessions
    const todayRes = await axios.get('http://localhost:5000/api/attendance/today', { headers });
    console.log('\n📊 Today\'s attendance summary:');
    
    if (Array.isArray(todayRes.data)) {
      let totalWorking = 0;
      let totalBreak = 0;
      let totalOvertime = 0;
      
      todayRes.data.forEach((session, index) => {
        console.log(`Session ${index + 1}:`, {
          checkIn: session.checkIn ? new Date(session.checkIn).toLocaleTimeString() : 'N/A',
          checkOut: session.checkOut ? new Date(session.checkOut).toLocaleTimeString() : 'N/A',
          status: session.status,
          workingMinutes: session.workingMinutes || 0,
          breakMinutes: session.breakMinutes || 0,
          overtimeHours: session.overtimeHours || 0
        });
        
        totalWorking += session.workingMinutes || 0;
        totalBreak += session.breakMinutes || 0;
        totalOvertime += session.overtimeHours || 0;
      });
      
      console.log('\n📈 Totals:');
      console.log(`Total Working Time: ${Math.floor(totalWorking / 60)}h ${totalWorking % 60}m`);
      console.log(`Total Break Time: ${Math.floor(totalBreak / 60)}h ${totalBreak % 60}m`);
      console.log(`Total Overtime: ${Math.floor(totalOvertime)}h ${(totalOvertime % 1) * 60}m`);
    } else {
      console.log('Single session:', {
        checkIn: todayRes.data.checkIn ? new Date(todayRes.data.checkIn).toLocaleTimeString() : 'N/A',
        checkOut: todayRes.data.checkOut ? new Date(todayRes.data.checkOut).toLocaleTimeString() : 'N/A',
        workingMinutes: todayRes.data.workingMinutes || 0,
        breakMinutes: todayRes.data.breakMinutes || 0,
        overtimeHours: todayRes.data.overtimeHours || 0
      });
    }
    
    console.log('\n✅ Multiple session workflow test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testCompleteWorkflow();
