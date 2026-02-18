const axios = require('axios');

// Test complete break workflow
async function testCompleteBreakWorkflow() {
  console.log('🔄 Testing complete break workflow...\n');
  
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
    
    // Step 1: Resume from break if currently on break
    if (todayRes.data[0]?.status === 'ON_BREAK') {
      console.log('\n📝 Step 1: Resuming from current break...');
      const resumeRes = await axios.post('http://localhost:5000/api/attendance/checkout', {}, { headers });
      console.log('✅ Resumed work:', resumeRes.data.message);
    }
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Take a new break
    console.log('\n📝 Step 2: Taking a new break...');
    const breakRes = await axios.post('http://localhost:5000/api/attendance/checkout', {
      checkoutType: 'BREAK',
      breakType: 'LUNCH'
    }, { headers });
    
    console.log('✅ Break response:', breakRes.data.message);
    if (breakRes.data.data?.breakStart) {
      console.log('✅ Break started at:', new Date(breakRes.data.data.breakStart).toLocaleTimeString());
    } else {
      console.log('ℹ️ Break started (no timestamp in response)');
    }
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 3: Resume from break
    console.log('\n📝 Step 3: Resuming from break...');
    const resumeRes = await axios.post('http://localhost:5000/api/attendance/checkout', {}, { headers });
    console.log('✅ Resumed work:', resumeRes.data.message);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 4: Check-in again for new session
    console.log('\n📝 Step 4: Starting new work session...');
    const checkInRes = await axios.post('http://localhost:5000/api/attendance/checkin', {}, { headers });
    console.log('✅ New session started at:', new Date(checkInRes.data.attendance.checkIn).toLocaleTimeString());
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 5: Take another break
    console.log('\n📝 Step 5: Taking another break...');
    const breakRes2 = await axios.post('http://localhost:5000/api/attendance/checkout', {
      checkoutType: 'BREAK',
      breakType: 'SHORT_BREAK'
    }, { headers });
    console.log('✅ Second break started');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 6: Resume and final checkout
    console.log('\n📝 Step 6: Final resume and checkout...');
    const finalResume = await axios.post('http://localhost:5000/api/attendance/checkout', {}, { headers });
    console.log('✅ Final resume:', finalResume.data.message);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const finalCheckout = await axios.post('http://localhost:5000/api/attendance/checkout', {
      checkoutType: 'FINAL'
    }, { headers });
    console.log('✅ Final checkout at:', new Date(finalCheckout.data.checkOut).toLocaleTimeString());
    
    // Get final summary
    const finalRes = await axios.get('http://localhost:5000/api/attendance/today', { headers });
    console.log('\n📊 Final Summary:');
    console.log('=' .repeat(40));
    
    if (Array.isArray(finalRes.data)) {
      finalRes.data.forEach((session, index) => {
        console.log(`Session ${index + 1}:`, {
          checkIn: session.checkIn ? new Date(session.checkIn).toLocaleTimeString() : 'N/A',
          checkOut: session.checkOut ? new Date(session.checkOut).toLocaleTimeString() : 'N/A',
          status: session.status,
          workingMinutes: session.workingMinutes || 0,
          breakMinutes: session.breakMinutes || 0,
          overtimeHours: session.overtimeHours || 0
        });
      });
    }
    
    console.log('\n🎉 Complete break workflow test successful!');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testCompleteBreakWorkflow();
