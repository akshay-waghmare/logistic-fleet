# Setup docs

This folder contains concise setup notes for common project tasks.

- **Submodules setup and sync** — see [submodules-setup.md](./submodules-setup.md) for Windows PowerShell steps and Linux equivalents to run after pulling.
- **Start the app with Docker** — see [docker-startup.md](./docker-startup.md) for end-to-end steps and troubleshooting.
- **Create admin users** — see [user-creation.md](./user-creation.md) for API and database methods to create console users.
- **Setup summary** — see [setup-summary.md](./setup-summary.md) for a summary of what was done and the issues encountered with fixes.

## Quick Start Commands

```powershell
# 1. Initialize submodules
git submodule update --init --recursive

# 2. Start Docker stack
docker compose up -d

# 3. Setup databases and permissions
docker compose exec application php artisan mysql:createdb
docker compose exec application php artisan migrate --force
docker compose exec application php artisan sandbox:migrate --force
docker compose exec application php artisan fleetbase:seed
docker compose exec application php artisan fleetbase:create-permissions

# 4. Create admin user
$body = '{"name":"Admin User","email":"admin@company.com","password":"password123","password_confirmation":"password123","organization_name":"My Company","phone":"+1234567890","timezone":"UTC","skip_verification":true}'; Invoke-WebRequest -Uri "http://localhost:8080/int/v1/onboard/create-account" -Method POST -ContentType "application/json" -Body $body
docker compose exec database mysql -u root -e "USE fleetbase; UPDATE users SET email_verified_at = NOW() WHERE email = 'admin@company.com';"
```

**Login:** http://localhost:4200/console/login (admin@company.com / password123)

Run commands from the repository root unless noted otherwise.
