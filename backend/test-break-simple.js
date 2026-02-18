const axios = require('axios');

// Simple test for break functionality
async function testBreakFunction() {
  console.log('🔍 Testing break function...\n');
  
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
    console.log('📊 Current status:', todayRes.data[0]?.status || 'No session');
    
    // Try to take a break
    console.log('\n📝 Taking a break...');
    const breakRes = await axios.post('http://localhost:5000/api/attendance/checkout', {
      checkoutType: 'BREAK',
      breakType: 'LUNCH'
    }, { headers });
    
    console.log('✅ Break response received');
    console.log('Response keys:', Object.keys(breakRes.data));
    console.log('Break start field:', breakRes.data.breakStart);
    console.log('Status:', breakRes.data.status);
    
    if (breakRes.data.breakStart) {
      console.log('✅ Break started at:', new Date(breakRes.data.breakStart).toLocaleTimeString());
    } else {
      console.log('❌ No break start time found');
    }
    
    // Check status after break
    const afterBreakRes = await axios.get('http://localhost:5000/api/attendance/today', { headers });
    console.log('\n📊 Status after break:', afterBreakRes.data[0]?.status);
    console.log('Break start in DB:', afterBreakRes.data[0]?.breakStart);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testBreakFunction();
