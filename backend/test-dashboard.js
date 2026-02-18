const axios = require('axios');

async function testDashboard() {
  try {
    console.log('Testing dashboard API...');
    
    // First login to get token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'hr@example.com',
      password: 'hr123'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, token received');
    
    // Test dashboard endpoint
    const dashboardResponse = await axios.get('http://localhost:5000/api/dashboard/stats', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Dashboard API successful!');
    console.log('Response status:', dashboardResponse.status);
    console.log('Dashboard data:', JSON.stringify(dashboardResponse.data, null, 2));
    
  } catch (error) {
    console.error('Dashboard API failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testDashboard();
