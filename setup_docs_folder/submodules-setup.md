# Submodule setup and sync

This documents what was done on startup and the equivalent to run after pulling changes.

Run these commands from the repository root.

## What I ran on startup (Windows PowerShell)

```powershell
# Replace SSH remotes with HTTPS in .gitmodules
(Get-Content .gitmodules) -replace 'git@github.com:', 'https://github.com/' | Set-Content .gitmodules

# Sync submodule config and fetch submodules
git submodule sync --recursive
git submodule update --init --recursive
```

## Linux equivalent (after git pull)

```bash
# Replace SSH remotes with HTTPS in .gitmodules
# This command uses sed to find and replace all instances of the SSH URL format with the HTTPS format in the .gitmodules file.
# The -i flag edits the file in place, and the s|old|new|g syntax specifies the substitution to perform globally.
sed -i 's|git@github.com:|https://github.com/|g' .gitmodules

# Sync submodule config and fetch submodules
git submodule sync --recursive
git submodule update --init --recursive
```

Notes:
- Using HTTPS avoids requiring SSH keys in environments where they aren't configured (e.g., CI, fresh machines).
- Always run from the repo root so .gitmodules is in scope.
