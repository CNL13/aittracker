# Authentication and security

- Custom username/password trong P0.
- Opaque httpOnly session.
- Không token ở localStorage.
- Không plaintext password.
- Không service role ở frontend.
- Không tin actor IDs từ client.
- Mutation kiểm tra session, quyền, validation và Origin.
- Không log credential.
- Reset/lock/inactive revoke session.
- Kiểm thử IDOR và admin cuối cùng.
