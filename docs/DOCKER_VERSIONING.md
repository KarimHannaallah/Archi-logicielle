# Docker Image Versioning

## Tag Strategy

Every Docker build produces up to 4 tags per image:

| Tag | When pushed | Example |
|-----|-------------|---------|
| `latest` | Every merge to `main` | `ghcr.io/.../task-service:latest` |
| `sha-<commit>` | Every build (any branch) | `ghcr.io/.../task-service:sha-a1b2c3d` |
| `<major>` | Only when `version` changes in `package.json` | `ghcr.io/.../task-service:1` |
| `<major.minor.patch>` | Only when `version` changes in `package.json` | `ghcr.io/.../task-service:1.0.0` |

## How It Works

1. **`docker/metadata-action`** reads the matrix service's `package.json` to extract the version
2. A version-change detection step compares the current version against the previous commit
3. Tags are generated dynamically:
   - `latest` and `sha-*` are always produced
   - Semver tags (`1`, `1.0.0`) are only added when the version actually changed

## Push Conditions

- **On `main`**: images are pushed to GHCR with all applicable tags
- **On other branches**: images are built (cache validation) but never pushed

## Services Covered

All 5 images use the same matrix strategy:
- `auth-service`
- `task-service`
- `project-service`
- `notification-service`
- `frontend`

## Bumping a Version

1. Update `version` in the service's `package.json` (e.g., `1.0.0` -> `1.1.0`)
2. Merge to `main`
3. The pipeline detects the change and pushes semver tags alongside `latest` and `sha-*`

## Rollback

Pin your deployment to a specific `sha-<commit>` or `<major.minor.patch>` tag. The `latest` tag always points to the most recent `main` build.