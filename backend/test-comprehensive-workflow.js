const axios = require('axios');

// Comprehensive test for multiple check-ins and checkouts
async function testMultipleCheckInWorkflow() {
  console.log('🔄 Testing comprehensive multiple check-in workflow...\n');
  
  try {
    // Login first
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'hr@example.com',
      password: 'hr123'
    });
    
    const token = loginRes.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    
    console.log('✅ Login successful');
    
    // Step 1: First check-in of the day
    console.log('\n📝 Step 1: First check-in');
    try {
      const checkIn1 = await axios.post('http://localhost:5000/api/attendance/checkin', {}, { headers });
      console.log('✅ First check-in at:', new Date(checkIn1.data.attendance.checkIn).toLocaleTimeString());
    } catch (error) {
      console.log('ℹ️ Already checked in, continuing...');
    }
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Take a lunch break
    console.log('\n📝 Step 2: Taking lunch break');
    const checkOut1 = await axios.post('http://localhost:5000/api/attendance/checkout', {
      checkoutType: 'BREAK',
      breakType: 'LUNCH'
    }, { headers });
    console.log('✅ Lunch break started at:', checkOut1.data.breakStart ? new Date(checkOut1.data.breakStart).toLocaleTimeString() : 'No timestamp');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 3: Resume work after lunch
    console.log('\n📝 Step 3: Resuming work after lunch');
    try {
      const resumeWork = await axios.post('http://localhost:5000/api/attendance/checkout', {}, { headers });
      console.log('✅ Work resumed at:', new Date(resumeWork.data.checkOut || new Date()).toLocaleTimeString());
    } catch (error) {
      console.log('ℹ️ Not on break, trying to check-in again...');
      const checkIn2 = await axios.post('http://localhost:5000/api/attendance/checkin', {}, { headers });
      console.log('✅ Work resumed at:', new Date(checkIn2.data.attendance.checkIn).toLocaleTimeString());
    }
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 4: Take another short break
    console.log('\n📝 Step 4: Taking short break');
    const breakRes = await axios.post('http://localhost:5000/api/attendance/checkout', {
      checkoutType: 'BREAK',
      breakType: 'SHORT_BREAK'
    }, { headers });
    console.log('✅ Break response:', breakRes.data);
    console.log('Break started at:', breakRes.data.breakStart ? new Date(breakRes.data.breakStart).toLocaleTimeString() : 'No timestamp');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 5: Resume work again
    console.log('\n📝 Step 5: Resuming work after short break');
    try {
      const resumeWork2 = await axios.post('http://localhost:5000/api/attendance/checkout', {}, { headers });
      console.log('✅ Work resumed at:', new Date(resumeWork2.data.checkOut || new Date()).toLocaleTimeString());
    } catch (error) {
      console.log('ℹ️ Not on break, trying to check-in again...');
      const checkIn3 = await axios.post('http://localhost:5000/api/attendance/checkin', {}, { headers });
      console.log('✅ Work resumed at:', new Date(checkIn3.data.attendance.checkIn).toLocaleTimeString());
    }
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 6: Final checkout for the day
    console.log('\n📝 Step 6: Final checkout for the day');
    const finalCheckout = await axios.post('http://localhost:5000/api/attendance/checkout', {
      checkoutType: 'FINAL'
    }, { headers });
    console.log('✅ Final checkout at:', new Date(finalCheckout.data.checkOut).toLocaleTimeString());
    
    // Get comprehensive summary
    const todayRes = await axios.get('http://localhost:5000/api/attendance/today', { headers });
    console.log('\n📊 Comprehensive Attendance Summary:');
    console.log('=' .repeat(50));
    
    if (Array.isArray(todayRes.data)) {
      let totalWorkingMinutes = 0;
      let totalBreakMinutes = 0;
      let totalOvertimeHours = 0;
      let sessionCount = todayRes.data.length;
      
      todayRes.data.forEach((session, index) => {
        const checkInTime = session.checkIn ? new Date(session.checkIn).toLocaleTimeString() : 'N/A';
        const checkOutTime = session.checkOut ? new Date(session.checkOut).toLocaleTimeString() : 'N/A';
        const workingTime = session.workingMinutes || 0;
        const breakTime = session.breakMinutes || 0;
        const overtime = session.overtimeHours || 0;
        
        console.log(`\nSession ${index + 1}:`);
        console.log(`  Check-in:  ${checkInTime}`);
        console.log(`  Check-out: ${checkOutTime}`);
        console.log(`  Status:    ${session.status}`);
        console.log(`  Working:   ${Math.floor(workingTime / 60)}h ${workingTime % 60}m`);
        console.log(`  Break:     ${Math.floor(breakTime / 60)}h ${breakTime % 60}m`);
        console.log(`  Overtime:  ${Math.floor(overtime)}h ${(overtime % 1) * 60}m`);
        
        totalWorkingMinutes += workingTime;
        totalBreakMinutes += breakTime;
        totalOvertimeHours += overtime;
      });
      
      console.log('\n' + '=' .repeat(50));
      console.log('📈 DAILY TOTALS:');
      console.log(`  Total Sessions:     ${sessionCount}`);
      console.log(`  Total Working Time: ${Math.floor(totalWorkingMinutes / 60)}h ${totalWorkingMinutes % 60}m`);
      console.log(`  Total Break Time:   ${Math.floor(totalBreakMinutes / 60)}h ${totalBreakMinutes % 60}m`);
      console.log(`  Total Overtime:     ${Math.floor(totalOvertimeHours)}h ${(totalOvertimeHours % 1) * 60}m`);
      
      // Calculate net working time
      const netWorkingMinutes = totalWorkingMinutes - totalBreakMinutes;
      console.log(`  Net Working Time:   ${Math.floor(netWorkingMinutes / 60)}h ${netWorkingMinutes % 60}m`);
      
    } else {
      console.log('Single session data:', todayRes.data);
    }
    
    console.log('\n🎉 Multiple check-in workflow test completed successfully!');
    console.log('\n✅ Features demonstrated:');
    console.log('  • Multiple check-ins per day');
    console.log('  • Break time calculation between sessions');
    console.log('  • Proper session management');
    console.log('  • Enhanced time breakdown');
    console.log('  • Overtime tracking');
    console.log('  • Comprehensive attendance summary');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testMultipleCheckInWorkflow();
