(async () => {
  try {
    const base = 'http://localhost:3000/api';

    const loginRes = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'md@example.com', password: 'Password123' }),
    });
    const login = await loginRes.json();
    console.log('LOGIN RESPONSE:', login);
    const token = login.token;
    if (!token) throw new Error('No token returned');

    const createRes = await fetch(base + '/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ employeeId: 'EMP999', fullName: 'Test Employee', email: 'test.employee+api@example.com', password: 'Test1234', role: 'EMPLOYEE' }),
    });
    const created = await createRes.json();
    console.log('CREATE RESPONSE:', created);

    const checkinRes = await fetch(base + '/attendance/checkin', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    });
    const checkin = await checkinRes.json();
    console.log('CHECKIN RESPONSE:', checkin);

    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
})();
