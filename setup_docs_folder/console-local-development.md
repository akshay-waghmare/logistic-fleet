# Console UI Local Development Guide

This guide explains how to set up local development for the Fleetbase Console UI to enable live reloading and faster development cycles.

## Overview

By default, the Docker setup uses pre-built images from Docker Hub which don't reflect local code changes. For active UI development, you need to either:
- **Option A**: Run console locally with live reloading (Recommended)
- **Option B**: Build console from source in Docker with volume mounts

## Option A: Local Console Development (Recommended)

### Prerequisites
- Node.js 18+ installed locally
- PNPM package manager (`npm install -g pnpm`)

### Setup Steps

1. **Link local packages to console dependencies:**
   ```bash
   cd console
   
   # Remove downloaded packages and link to local ones
   pnpm remove @fleetbase/fleetops-engine
   pnpm add link:../packages/fleetops
   
   # Optional: Link other packages if needed
   pnpm remove @fleetbase/ember-core
   pnpm add link:../packages/ember-core
   
   pnpm remove @fleetbase/ember-ui  
   pnpm add link:../packages/ember-ui
   ```

2. **Verify package linking:**
   ```bash
   # Check that packages are linked locally
   pnpm list @fleetbase/fleetops-engine
   # Should show: @fleetbase/fleetops-engine link:../packages/fleetops
   
   # Verify symlinks exist
   ls -la node_modules/@fleetbase/fleetops-engine
   # Should show a symlink to your local packages
   ```

3. **Stop Docker console service:**
   ```bash
   # From project root
   docker-compose stop console
   ```

4. **Start local development server:**
   ```bash
   cd console
   pnpm install  # Install dependencies if not done
   pnpm start    # Starts Ember dev server with live reloading
   ```

5. **Access the application:**
   - **Console**: http://localhost:4200 (local dev server)
   - **API**: http://localhost:8080 (Docker backend services)

### Benefits of Local Development
- ✅ **Live reloading** - Changes appear instantly
- ✅ **Hot module replacement** - Faster development cycles  
- ✅ **Better debugging** - Source maps and dev tools
- ✅ **Package changes** - Local package edits reflect immediately

## Option B: Docker Console with Volume Mounts

If you prefer to keep everything in Docker but still want to see local changes:

### 1. Update docker-compose.override.yml:
```yaml
services:
  console:
    build:
      context: ./console
      dockerfile: Dockerfile
      args:
        ENVIRONMENT: development
    ports:
      - "4200:4200"
    volumes:
      - ./console:/console
      - ./packages:/packages
      - ./console/fleetbase.config.json:/usr/share/nginx/html/fleetbase.config.json
    environment:
      - NODE_ENV=development
    depends_on:
      - application
      - socket
```

### 2. Apply changes:
```bash
# Stop and rebuild console
docker-compose stop console
docker-compose build console
docker-compose up -d console

# Watch logs for build process
docker-compose logs -f console
```

### Limitations of Docker Development
- ❌ **Slower rebuilds** - Need to rebuild on changes
- ❌ **No live reloading** - Manual restarts required
- ❌ **Resource intensive** - Building in container uses more resources

## Making Changes

### For UI Components/Templates:
1. **Edit files** in `console/app/` directory:
   - `console/app/templates/` - Handlebars templates
   - `console/app/components/` - Ember components
   - `console/app/styles/` - CSS/SCSS styles

2. **For package changes** (engines/extensions):
   - Edit files in `packages/fleetops/` or other linked packages
   - Changes reflect immediately with local development

### Example: Changing Dashboard Text
```bash
# Edit the dashboard template
code console/app/templates/console/home.hbs

# Or edit package translations  
code packages/fleetops/translations/en-us.yaml
```

## Configuration Files

### Console API Configuration
Ensure `console/fleetbase.config.json` points to correct API:
```json
{
    "API_HOST": "http://localhost:8080"
}
```

### Environment Variables
For local development, these are handled automatically by the Ember CLI dev server.

## Troubleshooting

### Package Linking Issues
```bash
# Reset package linking
cd console
rm -rf node_modules package-lock.json
pnpm install
pnpm add link:../packages/fleetops

# Verify linking worked
pnpm list @fleetbase/fleetops-engine
```

### Console Won't Start
```bash
# Check Node.js version
node --version  # Should be 18+

# Clear cache and reinstall
cd console
rm -rf node_modules dist tmp
pnpm install
pnpm start
```

### Changes Not Appearing
```bash
# For local development:
# Browser should auto-reload - check console for errors

# For Docker development:
docker-compose restart console
```

### API Connection Issues
```bash
# Verify backend services are running
docker-compose ps

# Check API is accessible
curl http://localhost:8080/ping

# Verify console config
cat console/fleetbase.config.json
```

## Production Deployment

When deploying to production:

1. **Unlink local packages** and use published versions:
   ```bash
   cd console
   pnpm remove @fleetbase/fleetops-engine
   pnpm add @fleetbase/fleetops-engine@latest
   ```

2. **Build production assets:**
   ```bash
   cd console
   pnpm build
   ```

3. **Use production Docker configuration** (without override mounts)

## Best Practices

1. **Use local development** for active UI work
2. **Link only packages you're actively modifying**
3. **Keep backend services in Docker** for consistency
4. **Test in Docker** before production deployment
5. **Document any custom configurations** in team documentation

## Development Workflow Summary

```bash
# Daily development workflow:
1. Start backend services: docker-compose up -d database cache application queue scheduler socket httpd
2. Stop Docker console: docker-compose stop console  
3. Start local console: cd console && pnpm start
4. Make changes in console/ or packages/ directories
5. Changes appear automatically in browser at http://localhost:4200
```

This setup gives you the best of both worlds: fast local development with reliable containerized backend services.
