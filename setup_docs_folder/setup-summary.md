# Setup summary and issues found

This document summarizes the actions taken to bring the stack uCommon failure signatures and fixes:

- SQLSTATE[HY000] Unknown database 'fleetbase_storefront' → run `php artisan mysql:createdb` first (creates core + extension schemas), then rerun migrations.
- SQLSTATE[42S02] table not found (e.g., model_has_roles, personal_access_tokens) → migrations didn't run; rerun step 3.
- Access denied or connection refused → ensure database container is healthy and `DATABASE_URL` is `mysql://root@database/fleetbase` (default compose).
- 422 validation error → include `password_confirmation` and valid phone/email in the payload.

## ✅ Verification Bypass Fixed

### Problem
- POST /int/v1/onboard/create-account was returning `skipVerification: false` for first user
- Console was redirecting to email verification page instead of bypassing

### Solution
- Modified OnboardController to use explicit count() checks instead of exists() calls
- Updated console to send `skip_verification: true` parameter in onboard request
- Added proper token provision when verification should be skipped
- Ensured database cleanup respects foreign key constraints

### Testing
Clear database before testing:
```powershell
docker compose exec database mysql -u root -e "USE fleetbase; DELETE FROM model_has_permissions; DELETE FROM model_has_roles; DELETE FROM personal_access_tokens; DELETE FROM company_users; DELETE FROM users; DELETE FROM companies;"
```

Test API response:
```powershell
$body = '{"name":"Admin User","email":"newadmin@mycompany.com","password":"password123","password_confirmation":"password123","organization_name":"My Company","phone":"+1987654321","timezone":"America/New_York","skip_verification":true}'; Invoke-WebRequest -Uri "http://localhost:8080/int/v1/onboard/create-account" -Method POST -ContentType "application/json" -Body $body
```

Expected response: `{"status":"success","session":"...","token":"...","skipVerification":true}`

## ✅ User Creation via API

### Method: API Account Creation (Recommended)

1. **Clear database** (if needed for fresh start):
```powershell
docker compose exec database mysql -u root -e "USE fleetbase; SET FOREIGN_KEY_CHECKS = 0; DELETE FROM model_has_permissions; DELETE FROM model_has_roles; DELETE FROM personal_access_tokens; DELETE FROM company_users; DELETE FROM users; DELETE FROM companies; DELETE FROM invites; SET FOREIGN_KEY_CHECKS = 1;"
```

2. **Create user and company via API**:
```powershell
$body = '{"name":"Admin User","email":"admin@company.com","password":"password123","password_confirmation":"password123","organization_name":"My Company","phone":"+1234567890","timezone":"UTC","skip_verification":true}'; Invoke-WebRequest -Uri "http://localhost:8080/int/v1/onboard/create-account" -Method POST -ContentType "application/json" -Body $body
```

3. **Verify email** (required for login):
```powershell
docker compose exec database mysql -u root -e "USE fleetbase; UPDATE users SET email_verified_at = NOW() WHERE email = 'admin@company.com';"
```

4. **Login to console**:
- URL: http://localhost:4200/console/login
- Email: `admin@company.com`
- Password: `password123`

### Expected API Response
```json
{"status":"success","session":"...","token":"...","skipVerification":true}
```

### Verification
- User and company created in database
- User linked to company via company_users table
- Email verification completed
- Console login accessible

---
ly and the issues encountered along the way, with their fixes.

## What we did

- Submodules
  - Converted any SSH submodule URLs to HTTPS for simplicity on first setup (Windows/Linux).
  - Synced and initialized all submodules recursively.
- Environment
  - Copied `api/.env.example` to `api/.env` and generated a Laravel `APP_KEY`.
- Docker
  - Validated `docker-compose.yml`, fixed duplicate services/indent issues from a prior edit.
  - Resolved host port conflict by changing `httpd` mapping from `8000` to `8080`.
  - Updated `console/fleetbase.config.json` to use `http://localhost:8080` for API_HOST.
  - Brought the stack up: database, cache, socket, application, queue, scheduler, httpd, console.
- Database
  - Ran migrations and seeders inside the `application` container.

## Issues we hit and fixes

- Port 8000 in use
  - Symptom: `httpd` failed to bind `0.0.0.0:8000`.
  - Fix: Re-mapped to `8080` in `docker-compose.yml` and pointed the Console to `http://localhost:8080`.

- Laravel APP_KEY missing
  - Symptom: API returned 500 with `MissingAppKeyException` via Nginx.
  - Fix: Generated an APP_KEY via `php artisan key:generate --show`, added to `api/.env`, restarted app and httpd.

- Branding endpoint 500 during onboarding
  - Symptom: GET `/int/v1/settings/branding` returned 500; Console onboarding button disabled.
  - Fixes:
    - Added a guard in `packages/core-api/src/Models/Setting.php::getBranding()` to return config defaults when DB is not ready (prevents crash on fresh installs).
    - Ran DB migrations/seeders to create the `settings` table and initial data.

- Onboarding skipVerification was false for first user
  - Symptom: POST `/int/v1/onboard/create-account` returned `skipVerification: false` even for the first admin user.
  - Fix: Updated `packages/core-api/src/Http/Controllers/Internal/v1/OnboardController.php` to check both User and Company existence for determining if verification should be skipped during initial setup.

- Console forced email verification even when skipVerification was true
  - Symptom: Console redirected to email verification page despite API returning `skipVerification: true`.
  - Fix: Updated `console/app/controllers/onboard/index.js` to respect the `skipVerification` flag and provide authentication token when verification is skipped.

## Current endpoints and ports

- Console: http://localhost:4200
- API via Nginx (`httpd`): http://localhost:8080
- Branding settings: http://localhost:8080/int/v1/settings/branding

## Next steps (optional)

- Decide whether to remove `docker-compose.override.yml` if one exists from earlier experiments to avoid drift.
- Link this folder from the repo `README.md` for easy visibility.

## DB migrations troubleshooting

If POST `/int/v1/onboard/create-account` returns 500 or the app shows migration errors, run the checks below.

1) Verify containers and DB health

```powershell
cd E:\Project\mailit-fleetbase\logistic-fleet
docker compose ps
docker compose logs database --tail 100
```

2) Confirm MySQL is reachable and the `fleetbase` database exists

```powershell
docker compose exec database sh -lc "mysql -uroot -e 'SELECT VERSION(); SHOW DATABASES; USE fleetbase; SHOW TABLES;'"
```

3) Run all migrations and seeders in the application container

```powershell
docker compose exec application php artisan mysql:createdb
docker compose exec application php artisan migrate --force
docker compose exec application php artisan sandbox:migrate --force
docker compose exec application php artisan fleetbase:seed
docker compose exec application php artisan fleetbase:create-permissions
docker compose exec application php artisan config:cache
docker compose exec application php artisan route:cache
```

4) Re-test onboarding with a complete payload (note password_confirmation is required)

```powershell
$body = @{
  name = 'Local Admin'
  email = 'admin+local@example.com'
  phone = '+10000000000'
  password = 'TempP@ssw0rd!'
  password_confirmation = 'TempP@ssw0rd!'
  timezone = 'UTC'
  organization_name = 'Local Org'
} | ConvertTo-Json
Invoke-WebRequest -Method POST -UseBasicParsing -Uri 'http://localhost:8080/int/v1/onboard/create-account' -ContentType 'application/json' -Body $body
```

Common failure signatures and fixes:

- SQLSTATE[HY000] Unknown database 'fleetbase_storefront' → run `php artisan mysql:createdb` first (creates core + extension schemas), then rerun migrations.
- SQLSTATE[42S02] table not found (e.g., model_has_roles, personal_access_tokens) → migrations didn’t run; rerun step 3.
- Access denied or connection refused → ensure database container is healthy and `DATABASE_URL` is `mysql://root@database/fleetbase` (default compose).
- 422 validation error → include `password_confirmation` and valid phone/email in the payload.
