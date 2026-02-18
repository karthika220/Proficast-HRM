const axios = require('axios');

// Debug test for break functionality
async function debugBreakWorkflow() {
  console.log('🔍 Debugging break workflow...\n');
  
  try {
    // Login first
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'hr@example.com',
      password: 'hr123'
    });
    
    const token = loginRes.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    
    console.log('✅ Login successful');
    
    // Check current status
    const todayRes = await axios.get('http://localhost:5000/api/attendance/today', { headers });
    console.log('📊 Current attendance status:');
    
    if (Array.isArray(todayRes.data)) {
      todayRes.data.forEach((session, index) => {
        console.log(`Session ${index + 1}:`, {
          checkIn: session.checkIn ? new Date(session.checkIn).toLocaleTimeString() : 'N/A',
          checkOut: session.checkOut ? new Date(session.checkOut).toLocaleTimeString() : 'N/A',
          breakStart: session.breakStart ? new Date(session.breakStart).toLocaleTimeString() : 'N/A',
          breakEnd: session.breakEnd ? new Date(session.breakEnd).toLocaleTimeString() : 'N/A',
          status: session.status
        });
      });
    } else {
      console.log('Single session:', todayRes.data);
    }
    
    // Try to take a break
    console.log('\n📝 Attempting to take a break...');
    try {
      const breakRes = await axios.post('http://localhost:5000/api/attendance/checkout', {
        checkoutType: 'BREAK',
        breakType: 'LUNCH'
      }, { headers });
      
      console.log('✅ Break response:', breakRes.data);
      console.log('Break started at:', breakRes.data.checkOut ? new Date(breakRes.data.checkOut).toLocaleTimeString() : 'No timestamp');
      
    } catch (error) {
      console.log('❌ Break error:', error.response?.data);
    }
    
    // Check status after break attempt
    const afterBreakRes = await axios.get('http://localhost:5000/api/attendance/today', { headers });
    console.log('\n📊 Status after break attempt:');
    
    if (Array.isArray(afterBreakRes.data)) {
      afterBreakRes.data.forEach((session, index) => {
        console.log(`Session ${index + 1}:`, {
          checkIn: session.checkIn ? new Date(session.checkIn).toLocaleTimeString() : 'N/A',
          checkOut: session.checkOut ? new Date(session.checkOut).toLocaleTimeString() : 'N/A',
          breakStart: session.breakStart ? new Date(session.breakStart).toLocaleTimeString() : 'N/A',
          breakEnd: session.breakEnd ? new Date(session.breakEnd).toLocaleTimeString() : 'N/A',
          status: session.status
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.response?.data || error.message);
  }
}

debugBreakWorkflow();
