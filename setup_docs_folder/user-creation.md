# User Creation Guide

This document provides quick commands to create admin users for the Fleetbase application.

## Quick Admin User Creation

### Prerequisites
- Docker stack running (see [docker-startup.md](./docker-startup.md))
- Database migrations completed
- Permissions created (`php artisan fleetbase:create-permissions`)

### Method 1: API Creation (Recommended)

```powershell
# 1. Clear existing data (optional - only if starting fresh)
docker compose exec database mysql -u root -e "USE fleetbase; SET FOREIGN_KEY_CHECKS = 0; DELETE FROM model_has_permissions; DELETE FROM model_has_roles; DELETE FROM personal_access_tokens; DELETE FROM company_users; DELETE FROM users; DELETE FROM companies; DELETE FROM invites; SET FOREIGN_KEY_CHECKS = 1;"

# 2. Create user via API
$body = '{"name":"Admin User","email":"admin@company.com","password":"password123","password_confirmation":"password123","organization_name":"My Company","phone":"+1234567890","timezone":"UTC","skip_verification":true}'
Invoke-WebRequest -Uri "http://localhost:8080/int/v1/onboard/create-account" -Method POST -ContentType "application/json" -Body $body

# 3. Verify email (required for login)
docker compose exec database mysql -u root -e "USE fleetbase; UPDATE users SET email_verified_at = NOW() WHERE email = 'admin@company.com';"
```

### Method 2: Direct Database Insert

```powershell
# 1. Create company
docker compose exec database mysql -u root -e "USE fleetbase; INSERT INTO companies (uuid, name, created_at, updated_at) VALUES (UUID(), 'My Company', NOW(), NOW());"

# 2. Create user (password is bcrypt of 'password123')
docker compose exec database mysql -u root -e "USE fleetbase; INSERT INTO users (uuid, name, email, phone, password, email_verified_at, created_at, updated_at) VALUES (UUID(), 'Admin User', 'admin@company.com', '+1234567890', '\$2y\$10\$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', NOW(), NOW(), NOW());"

# 3. Link user to company
docker compose exec database mysql -u root -e "USE fleetbase; INSERT INTO company_users (uuid, company_uuid, user_uuid, created_at, updated_at) SELECT UUID(), c.uuid, u.uuid, NOW(), NOW() FROM companies c, users u WHERE c.name='My Company' AND u.email='admin@company.com';"
```

## Login Credentials

Once created, login at: **http://localhost:4200/console/login**

- **Email:** `admin@company.com`
- **Password:** `password123`

## Verification Commands

### Check if user was created
```powershell
docker compose exec database mysql -u root -e "USE fleetbase; SELECT id, name, email, email_verified_at FROM users WHERE email = 'admin@company.com';"
```

### Check company linkage
```powershell
docker compose exec database mysql -u root -e "USE fleetbase; SELECT u.name as user_name, c.name as company_name FROM users u JOIN company_users cu ON u.uuid = cu.user_uuid JOIN companies c ON cu.company_uuid = c.uuid WHERE u.email = 'admin@company.com';"
```

## Troubleshooting

### "No user found by the provided identity"
- Ensure email is verified: `UPDATE users SET email_verified_at = NOW() WHERE email = 'admin@company.com';`
- Check user exists in database
- Verify company linkage exists

### Foreign key constraint errors
- Use `SET FOREIGN_KEY_CHECKS = 0;` before deletions
- Delete in order: model_has_permissions → model_has_roles → personal_access_tokens → company_users → users → companies → invites

### Validation errors during API creation
- Avoid words like "test" in name/organization (forbidden words filter)
- Use phone format: `+1234567890` (must start with +)
- Include `password_confirmation` matching `password`

## Alternative User Data

If you need different user data:

```powershell
# Example with different details
$body = '{"name":"Fleet Manager","email":"manager@fleet.com","password":"secure123","password_confirmation":"secure123","organization_name":"Fleet Operations","phone":"+1555000123","timezone":"America/New_York","skip_verification":true}'
Invoke-WebRequest -Uri "http://localhost:8080/int/v1/onboard/create-account" -Method POST -ContentType "application/json" -Body $body

# Verify the new user
docker compose exec database mysql -u root -e "USE fleetbase; UPDATE users SET email_verified_at = NOW() WHERE email = 'manager@fleet.com';"
```
