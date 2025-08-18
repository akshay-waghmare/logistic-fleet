# Local Packages Setup with File Protocol

This document explains how to use local packages via the file protocol instead of remote npm packages for Fleetbase development.

## Overview

When developing Fleetbase applications, you often need to work with multiple interconnected packages simultaneously. Using local packages via the file protocol allows you to:

- Make real-time changes across multiple packages
- Test changes immediately without publishing to npm
- Maintain consistency across your development environment
- Avoid version conflicts during development

## Current Package Structure

The Fleetbase monorepo includes these local packages in the `packages/` directory:

```
packages/
├── core-api/
├── dev-engine/
├── ember-core/
├── ember-ui/
├── fleetbase-extensions-indexer/
├── fleetops/
├── fleetops-data/
├── iam-engine/
├── ledger/
├── pallet/
├── registry-bridge/
└── storefront/
```

## Step-by-Step Setup

### 1. Identify Packages to Use Locally

First, determine which packages you want to use locally. Common candidates include:
- `@fleetbase/ember-core`
- `@fleetbase/ember-ui`
- `@fleetbase/fleetops-data`
- `@fleetbase/fleetops-engine`
- `@fleetbase/iam-engine`
- `@fleetbase/registry-bridge-engine`

### 2. Update package.json Dependencies

Navigate to your console directory and modify the `package.json` file:

```json
{
  "dependencies": {
    "@fleetbase/ember-core": "file:../packages/ember-core",
    "@fleetbase/ember-ui": "file:../packages/ember-ui",
    "@fleetbase/fleetops-data": "file:../packages/fleetops-data",
    "@fleetbase/fleetops-engine": "file:../packages/fleetops",
    "@fleetbase/iam-engine": "file:../packages/iam-engine",
    "@fleetbase/registry-bridge-engine": "file:../packages/registry-bridge"
  }
}
```

### 3. Update pnpm Overrides

Ensure your pnpm overrides section uses local packages:

```json
{
  "pnpm": {
    "overrides": {
      "@fleetbase/ember-core": "file:../packages/ember-core",
      "@fleetbase/ember-ui": "file:../packages/ember-ui",
      "@fleetbase/fleetops-data": "file:../packages/fleetops-data",
      "@fleetbase/fleetops-engine": "file:../packages/fleetops",
      "@fleetbase/iam-engine": "file:../packages/iam-engine"
    }
  }
}
```

### 4. Clean and Reinstall Dependencies

Execute these commands in the console directory:

```bash
# Remove existing node_modules and lock file
rm -rf node_modules pnpm-lock.yaml

# Clear pnpm cache (optional but recommended)
pnpm store prune

# Reinstall dependencies with local packages
pnpm install
```

### 5. Verify Local Package Installation

Check that local packages are properly linked:

```bash
# List installed packages to verify local links
pnpm list --depth=0

# Check symlinks in node_modules
ls -la node_modules/@fleetbase/

# Verify specific package paths
readlink node_modules/@fleetbase/ember-ui
```

## Development Workflow

### Making Changes to Local Packages

1. **Navigate to the local package**:
   ```bash
   cd packages/ember-ui
   ```

2. **Make your changes** to the package source code

3. **Build the package** (if it has a build process):
   ```bash
   npm run build
   # or
   pnpm build
   # or whatever build command is defined
   ```

4. **Return to console and restart the development server**:
   ```bash
   cd ../../console
   pnpm start
   ```

### Watching for Changes

For packages that support watch mode, you can run them in parallel:

```bash
# Terminal 1: Watch and build ember-ui
cd packages/ember-ui
npm run build:watch

# Terminal 2: Run console development server
cd console
pnpm start:dev
```

## Current Configuration Example

Based on the existing `console/package.json`, here's the current setup:

```json
{
  "dependencies": {
    "@fleetbase/ember-ui": "file:../packages/ember-ui",
    "@fleetbase/ember-core": "latest",
    "@fleetbase/fleetops-data": "latest"
  },
  "pnpm": {
    "overrides": {
      "@fleetbase/ember-core": "latest",
      "@fleetbase/ember-ui": "file:../packages/ember-ui",
      "@fleetbase/fleetops-data": "latest"
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Package not found**: Ensure the relative path is correct from console to packages
2. **Build errors**: Make sure local packages have their dependencies installed
3. **Symlink issues**: On Windows, ensure you have symlink permissions or use junction links
4. **Cache issues**: Clear pnpm cache with `pnpm store prune`

### Verification Commands

```bash
# Check if packages are properly linked
pnpm why @fleetbase/ember-ui

# Verify package resolution
pnpm list @fleetbase/ember-ui

# Check for peer dependency issues
pnpm install --dry-run
```

### Windows-Specific Considerations

On Windows, you might need to:

1. **Enable Developer Mode** or run as Administrator for symlink creation
2. **Use Git Bash** or WSL for better Unix-like command support
3. **Check file path lengths** if you encounter path too long errors

## Best Practices

1. **Keep packages in sync**: Ensure all local packages have compatible versions
2. **Document dependencies**: Keep track of which packages are using local vs remote versions
3. **Test thoroughly**: Local changes affect all dependent packages immediately
4. **Use version control**: Commit package.json changes to track local package usage
5. **Build automation**: Set up watch modes for packages that need compilation

## Reverting to Remote Packages

To switch back to remote packages:

1. **Update package.json**:
   ```json
   {
     "dependencies": {
       "@fleetbase/ember-core": "^0.2.9",
       "@fleetbase/ember-ui": "^1.0.0"
     }
   }
   ```

2. **Clean and reinstall**:
   ```bash
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

## Related Documentation

- [Console Local Development](console-local-development.md)
- [Submodules Setup](submodules-setup.md)
- [Setup Summary](setup-summary.md)

---

**Note**: This setup is primarily for development purposes. For production builds, ensure you're using stable, published versions of packages or have appropriate CI/CD processes in place to handle local package builds.