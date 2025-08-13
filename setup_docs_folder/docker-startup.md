# Start the app with Docker

This documents exactly how we started the stack locally and resolved issues.

Run all commands from the repo root.

## Prerequisites
- Docker Desktop (with Compose v2)
- PowerShell (Windows) or Bash (Linux/Mac)

## Steps (Windows PowerShell)

```powershell
# 1) Ensure submodules and HTTPS remotes
(Get-Content .gitmodules) -replace 'git@github.com:', 'https://github.com/' | Set-Content .gitmodules
 git submodule sync --recursive
 git submodule update --init --recursive

# 2) Create Laravel env file if missing
if (!(Test-Path -Path "api/.env")) { Copy-Item "api/.env.example" "api/.env" -Force }

# 3) Start containers (first run will pull images)
docker compose up -d

# 4) If http://localhost:8080 returns 500 (missing APP_KEY), generate and set it:
$APP_KEY = docker compose exec application php artisan key:generate --show
(Get-Content api/.env) -replace "^APP_KEY=.*", "APP_KEY=$APP_KEY" | Set-Content api/.env
# Restart services to apply
 docker compose restart application httpd

# 4) Create databases (core + extensions)

```powershell
docker compose exec application php artisan mysql:createdb
```

This provisions the core DB (fleetbase), sandbox, and extension schemas (for example, fleetbase_storefront).

# 5) Verify
(Invoke-WebRequest -UseBasicParsing http://localhost:8080).StatusCode  # should be 200
Start-Process http://localhost:4200  # Console UI
```

## Notes
- API is proxied via Nginx on http://localhost:8080
- Console UI is on http://localhost:4200
- MySQL is on host port 3306, Redis internal only.

## Linux/macOS equivalent

```bash
# 1) Submodules over HTTPS, then sync and update
sed -i 's|git@github.com:|https://github.com/|g' .gitmodules
 git submodule sync --recursive
 git submodule update --init --recursive

# 2) Ensure Laravel env exists
[ -f api/.env ] || cp api/.env.example api/.env

# 3) Start containers
docker compose up -d

# 4) If API returns 500 (missing APP_KEY), generate and set it:
APP_KEY=$(docker compose exec application php artisan key:generate --show)
sed -i "s|^APP_KEY=.*|APP_KEY=${APP_KEY}|" api/.env
# Restart services
docker compose restart application httpd

# 5) Verify
curl -I http://localhost:8080 | head -n1
xdg-open http://localhost:4200 2>/dev/null || open http://localhost:4200 2>/dev/null || true
```
