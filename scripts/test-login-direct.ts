import handler from '../api/auth/login.js';

async function testDirect() {
  const req: any = {
    method: 'POST',
    body: { username: 'admin', password: 'password123' },
    headers: { 'x-forwarded-for': '127.0.0.1' },
    socket: { remoteAddress: '127.0.0.1' },
  };

  const res: any = {
    statusCode: 200,
    headers: {},
    setHeader(k: string, v: string) {
      this.headers[k] = v;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      console.log('LOGIN HANDLER RESPONSE CODE:', this.statusCode);
      console.log('LOGIN HANDLER RESPONSE DATA:', data);
      console.log('LOGIN HANDLER HEADERS:', this.headers);
      return this;
    },
  };

  await handler(req, res);
  process.exit(0);
}

testDirect();
