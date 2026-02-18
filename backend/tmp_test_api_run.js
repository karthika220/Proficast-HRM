const fs = require('fs');
(async () => {
  try {
    const base = 'http://localhost:3000/api';

    const loginRes = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'md@example.com', password: 'Password123' }),
    });
    const login = await loginRes.json();

    const token = login.token || null;

    let created = null;
    if (token) {
      const createRes = await fetch(base + '/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ employeeId: 'EMP999', fullName: 'Test Employee', email: 'test.employee+api@example.com', password: 'Test1234', role: 'EMPLOYEE' }),
      });
      created = await createRes.json();

      const checkinRes = await fetch(base + '/attendance/checkin', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
      });
      const checkin = await checkinRes.json();

      fs.writeFileSync('tmp_test_api_output.json', JSON.stringify({ login, created, checkin }, null, 2));
    } else {
      fs.writeFileSync('tmp_test_api_output.json', JSON.stringify({ login }, null, 2));
    }

    console.log('WROTE tmp_test_api_output.json');
    process.exit(0);
  } catch (err) {
    fs.writeFileSync('tmp_test_api_output.json', JSON.stringify({ error: err.message }, null, 2));
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
