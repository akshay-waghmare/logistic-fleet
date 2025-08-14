# Transfer database to DigitalOcean Droplet and verify

This guide shows how to export your local MySQL data (Dockerized), copy it to a DigitalOcean Droplet, import it, and verify the stack.

Assumptions
- Local DB runs in Docker Compose with service name `database` and user `root` (empty password), schemas: `fleetbase`, `fleetbase_sandbox`, `fleetbase_storefront`.
- Run commands from the repo root (where `docker-compose.yml` is).
- Droplet project path: `~/fleetbase-mailit/logistic-fleet`.

## 1) Create a multi-database dump locally

Windows PowerShell (repo root):

```powershell
# Creates ./docker/database/db-multi.sql.gz via container
$cmd = 'mysqldump -uroot --password= --single-transaction --routines --triggers --events --add-drop-table --databases fleetbase fleetbase_sandbox fleetbase_storefront | gzip > /docker-entrypoint-initdb.d/db-multi.sql.gz'
docker compose exec database sh -lc $cmd

# Optional: list the file on host
Get-ChildItem .\docker\database\db-multi.sql.gz
```

Bash alternative:

```bash
docker compose exec database sh -lc 'mysqldump -uroot --password= --single-transaction --routines --triggers --events --add-drop-table --databases fleetbase fleetbase_sandbox fleetbase_storefront | gzip > /docker-entrypoint-initdb.d/db-multi.sql.gz'
ls -lh ./docker/database/db-multi.sql.gz
```

Notes
- Do NOT copy raw `/var/lib/mysql` files between machines. Use dumps.
- `--databases` includes CREATE DATABASE/USE statements so schemas are created on import.

## 2) Copy the dump to the Droplet

```powershell
# Replace IP/path if different
scp .\docker\database\db-multi.sql.gz root@<DROPLET_IP>:~/fleetbase-mailit/logistic-fleet/docker/database/db-multi.sql.gz
```

## 3) Import on the Droplet

SSH into the Droplet and `cd` to the project directory.

Option A — Fresh data dir (auto-import on first run)
```bash
# Inside the Droplet, from project root
rm -rf ./docker/database/mysql           # ensure a fresh MySQL data dir
# Confirm dump exists
ls -lh ./docker/database/db-multi.sql.gz
# Start only the DB to initialize and auto-import
docker compose up -d database
```

Option B — Existing data dir (manual import)
```bash
# Start DB if not running
docker compose up -d database
# Import all schemas from the dump (root user, empty password)
docker compose exec database sh -lc 'gunzip -c /docker-entrypoint-initdb.d/db-multi.sql.gz | mysql -uroot --password='
```

If a schema is missing and you didn’t use `--databases`, create it first:
```bash
docker compose exec database sh -lc 'mysql -uroot --password= -e "CREATE DATABASE IF NOT EXISTS fleetbase DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE DATABASE IF NOT EXISTS fleetbase_sandbox DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE DATABASE IF NOT EXISTS fleetbase_storefront DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"'
```

## 4) Start application services

```bash
docker compose up -d
# (Optional) cache config/routes after env changes
docker compose exec application php artisan config:cache
docker compose exec application php artisan route:cache
```

## 5) Verification checklist

Containers and health
```bash
docker compose ps
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
```

Databases present and sizes
```bash
docker compose exec database mysql -uroot --password= -e "SHOW DATABASES;"
docker compose exec database mysql -uroot --password= -e "SELECT table_schema AS db, ROUND(SUM(data_length+index_length)/1024/1024,2) AS size_mb FROM information_schema.tables GROUP BY table_schema ORDER BY size_mb DESC;"
```

Tables exist in core DBs
```bash
docker compose exec database mysql -uroot --password= -D fleetbase -e "SHOW TABLES;" | head -n 20
docker compose exec database mysql -uroot --password= -D fleetbase_sandbox -e "SHOW TABLES;" | head -n 20
docker compose exec database mysql -uroot --password= -D fleetbase_storefront -e "SHOW TABLES;" | head -n 20
```

Service endpoints
```bash
# API via httpd on port 8080
curl -I http://<DROPLET_IP>:8080
# Console UI
curl -I http://<DROPLET_IP>:4200
# SocketCluster
curl -I http://<DROPLET_IP>:38000
```

Laravel connectivity
```bash
docker compose exec application php artisan about
docker compose exec application php artisan migrate:status
```

## 6) Troubleshooting

- Access denied during import: use `mysql -uroot --password=` per compose creds.
- Dump not found: verify it exists at `./docker/database/db-multi.sql.gz` on the Droplet.
- No auto-import: only happens on first init (empty `/var/lib/mysql`). Use manual import if data dir exists.
- Requests hitting `localhost`: update `api/.env` (`APP_URL`, `SESSION_DOMAIN`, socket settings) and `console/fleetbase.config.json` to your Droplet IP/host; restart `application` and `console`.
- Security: avoid exposing MySQL publicly. Remove `"3306:3306"` ports mapping unless needed temporarily.

---

Success criteria
- All three schemas restored with expected table counts.
- `docker compose ps` shows healthy `database`, `application`, `httpd`, `console`, `cache`, and `socket`.
- `curl -I http://<DROPLET_IP>:8080` returns 200/302.
- Console at `http://<DROPLET_IP>:4200` calls API at `http://<DROPLET_IP>:8080` (verify in browser Network tab).
