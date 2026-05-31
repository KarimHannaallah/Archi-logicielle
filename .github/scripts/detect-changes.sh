#!/bin/bash
set -euo pipefail

# Determine the base commit to compare against.
# In a GitHub Actions PR context, GITHUB_BASE_REF is set.
# In a push context, compare against the previous commit.
# Locally (no CI env), fall back to main.
if [ -n "${GITHUB_BASE_REF:-}" ]; then
  git fetch origin "${GITHUB_BASE_REF}" --depth=1 2>/dev/null || true
  BASE="origin/${GITHUB_BASE_REF}"
elif [ -n "${GITHUB_EVENT_BEFORE:-}" ] && [ "${GITHUB_EVENT_BEFORE}" != "0000000000000000000000000000000000000000" ]; then
  BASE="${GITHUB_EVENT_BEFORE}"
else
  BASE="HEAD~1"
fi

CHANGED_FILES=$(git diff --name-only "${BASE}" HEAD 2>/dev/null || git diff --name-only HEAD~1 HEAD)

echo "Base ref: ${BASE}"
echo "Changed files:"
echo "${CHANGED_FILES}"
echo "---"

detect() {
  local prefix="$1"
  echo "${CHANGED_FILES}" | grep -q "^${prefix}/" && echo "true" || echo "false"
}

TASK_SERVICE_CHANGED=$(detect "services/task-service")
PROJECT_SERVICE_CHANGED=$(detect "services/project-service")
NOTIFICATION_SERVICE_CHANGED=$(detect "services/notification-service")
FRONTEND_CHANGED=$(detect "frontend")

echo "TASK_SERVICE_CHANGED=${TASK_SERVICE_CHANGED}"
echo "PROJECT_SERVICE_CHANGED=${PROJECT_SERVICE_CHANGED}"
echo "NOTIFICATION_SERVICE_CHANGED=${NOTIFICATION_SERVICE_CHANGED}"
echo "FRONTEND_CHANGED=${FRONTEND_CHANGED}"

# Export to GitHub Actions environment file if available, otherwise export to shell.
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "TASK_SERVICE_CHANGED=${TASK_SERVICE_CHANGED}"
    echo "PROJECT_SERVICE_CHANGED=${PROJECT_SERVICE_CHANGED}"
    echo "NOTIFICATION_SERVICE_CHANGED=${NOTIFICATION_SERVICE_CHANGED}"
    echo "FRONTEND_CHANGED=${FRONTEND_CHANGED}"
  } >> "${GITHUB_OUTPUT}"
else
  export TASK_SERVICE_CHANGED
  export PROJECT_SERVICE_CHANGED
  export NOTIFICATION_SERVICE_CHANGED
  export FRONTEND_CHANGED
fi