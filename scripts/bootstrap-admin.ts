import * as readline from 'readline';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

// Helper to ask questions on the command line
function askQuestion(query: string, hidden: boolean = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (!hidden) {
      rl.question(query, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    } else {
      process.stdout.write(query);
      let password = '';
      const stdin = process.stdin;

      readline.emitKeypressEvents(stdin);
      if (stdin.isTTY) {
        stdin.setRawMode(true);
      }

      const onKeypress = (chunk: string, key: { name?: string; ctrl?: boolean }) => {
        if (key && key.name === 'return') {
          process.stdout.write('\n');
          cleanup();
          resolve(password);
        } else if (key && key.name === 'backspace') {
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else if (key && key.ctrl && key.name === 'c') {
          cleanup();
          process.exit(130);
        } else {
          if (chunk) {
            password += chunk;
            process.stdout.write('*');
          }
        }
      };

      const cleanup = () => {
        if (stdin.isTTY) {
          stdin.setRawMode(false);
        }
        stdin.removeListener('keypress', onKeypress);
        rl.close();
      };

      stdin.on('keypress', onKeypress);
    }
  });
}

async function bootstrap() {
  let username = process.env['ADMIN_USERNAME'];
  let password = process.env['ADMIN_PASSWORD'];

  if (!username) {
    username = await askQuestion('Nhập tên đăng nhập admin (3-50 ký tự): ');
  }
  if (!password) {
    password = await askQuestion('Nhập mật khẩu admin (tối thiểu 8 ký tự): ', true);
  }

  if (!username || username.length < 3 || username.length > 50) {
    console.error('Lỗi: Tên đăng nhập admin phải từ 3 đến 50 ký tự.');
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error('Lỗi: Mật khẩu phải tối thiểu 8 ký tự.');
    process.exit(1);
  }

  const DATABASE_URL = process.env['DATABASE_URL'] || 'postgres://postgres:postgres@localhost:5432/postgres';
  console.log('Đang kết nối database để tạo tài khoản admin...');

  const sql = postgres(DATABASE_URL, {
    ssl: process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    const normalizedUsername = username.toLowerCase().trim();

    // Check if user already exists
    const existingUsers = await sql`
      SELECT id FROM users WHERE normalized_username = ${normalizedUsername}
    `;

    if (existingUsers.length > 0) {
      console.error(`Lỗi: Người dùng với tên đăng nhập "${username}" đã tồn tại.`);
      process.exit(1);
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    await sql.begin(async (tx) => {
      const [user] = await tx`
        INSERT INTO users (
          username,
          normalized_username,
          full_name,
          role,
          status,
          must_change_password
        ) VALUES (
          ${username},
          ${normalizedUsername},
          'System Administrator',
          'admin',
          'active',
          true
        ) RETURNING id
      `;

      if (!user) {
        throw new Error('Không thể tạo thông tin người dùng trong bảng users.');
      }

      await tx`
        INSERT INTO user_credentials (
          user_id,
          password_hash,
          password_changed_at
        ) VALUES (
          ${user.id},
          ${passwordHash},
          CURRENT_TIMESTAMP
        )
      `;
    });

    console.log(`\nThành công: Tài khoản admin "${username}" đã được khởi tạo thành công.`);
    console.log('Cờ must_change_password được thiết lập thành true.');
  } catch (err) {
    console.error('Lỗi xảy ra trong quá trình bootstrap admin:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

bootstrap();
