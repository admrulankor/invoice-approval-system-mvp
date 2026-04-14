# Quick Start Guide

To install dependencies:

```bash
bun install
```

To start a development server:

```bash
bun dev
```

To run for production:

```bash
bun start
```

This project was created using `bun init` in bun v1.3.12. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Authentication

The app now uses account-based authentication with HttpOnly cookie sessions.

- Roles: `MAKER`, `CHECKER_1`, `CHECKER_2`, `SIGNER`
- Account creation: admin-only via `/api/auth/accounts`
- Session endpoints: `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`
- Password endpoint: `/api/auth/change-password` (authenticated user)

### Bootstrap accounts

On first startup (empty database), the server auto-creates:

- `admin` (role: `ADMIN`)
- `maker` (role: `MAKER`)
- `checker1` (role: `CHECKER_1`)
- `checker2` (role: `CHECKER_2`)
- `signer` (role: `SIGNER`)

Default passwords can be overridden with environment variables:

- `ADMIN_PASSWORD` (default: `Admin@12345`)
- `DEFAULT_USER_PASSWORD` (default: `ChangeMe@123`)
- `JWT_SECRET` (set this in non-dev environments)
