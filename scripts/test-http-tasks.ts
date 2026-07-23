import fetch from 'node-fetch';

async function testFullFlow() {
  try {
    // 1. Login to get session cookie
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' }),
    });

    const setCookie = loginRes.headers.get('set-cookie');
    console.log('LOGIN STATUS:', loginRes.status);
    console.log('SET-COOKIE:', setCookie);

    // 2. Fetch /api/tasks/my with session cookie
    const tasksRes = await fetch('http://localhost:3001/api/tasks/my', {
      headers: { cookie: setCookie || '' },
    });

    console.log('TASKS API STATUS:', tasksRes.status);
    const data = await tasksRes.json();
    console.log('TASKS RETURNED COUNT:', data.tasks?.length);
    console.log('TASKS DATA:', data);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}

testFullFlow();
