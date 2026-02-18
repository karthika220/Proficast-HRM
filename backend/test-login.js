const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login endpoint...');
    
    // Test HR login
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'hr@example.com',
      password: 'hr123'
    });
    
    console.log('Login successful!');
    console.log('Response:', response.data);
    console.log('Token:', response.data.token ? '✅' : '❌');
    console.log('User:', response.data.user ? '✅' : '❌');
    
  } catch (error) {
    console.error('Login failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    }
  }
}

testLogin();
