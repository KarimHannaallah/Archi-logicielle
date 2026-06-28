#!/bin/bash
set -euo pipefail

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

AUTH_SERVICE_CHANGED=$(detect "services/auth-service")
TASK_SERVICE_CHANGED=$(detect "services/task-service")
PROJECT_SERVICE_CHANGED=$(detect "services/project-service")
NOTIFICATION_SERVICE_CHANGED=$(detect "services/notification-service")
FRONTEND_CHANGED=$(detect "frontend")
SHARED_CHANGED=$(detect "packages")

# Si un package partagé change → forcer le rebuild de tous les services
if [ "${SHARED_CHANGED}" = "true" ]; then
    AUTH_SERVICE_CHANGED="true"
    TASK_SERVICE_CHANGED="true"
    PROJECT_SERVICE_CHANGED="true"
    NOTIFICATION_SERVICE_CHANGED="true"
    FRONTEND_CHANGED="true"
fi

echo "AUTH_SERVICE_CHANGED=${AUTH_SERVICE_CHANGED}"
echo "TASK_SERVICE_CHANGED=${TASK_SERVICE_CHANGED}"
echo "PROJECT_SERVICE_CHANGED=${PROJECT_SERVICE_CHANGED}"
echo "NOTIFICATION_SERVICE_CHANGED=${NOTIFICATION_SERVICE_CHANGED}"
echo "FRONTEND_CHANGED=${FRONTEND_CHANGED}"
echo "SHARED_CHANGED=${SHARED_CHANGED}"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "auth-service=${AUTH_SERVICE_CHANGED}"
    echo "task-service=${TASK_SERVICE_CHANGED}"
    echo "project-service=${PROJECT_SERVICE_CHANGED}"
    echo "notification-service=${NOTIFICATION_SERVICE_CHANGED}"
    echo "frontend=${FRONTEND_CHANGED}"
  } >> "${GITHUB_OUTPUT}"
else
  export AUTH_SERVICE_CHANGED
  export TASK_SERVICE_CHANGED
  export PROJECT_SERVICE_CHANGED
  export NOTIFICATION_SERVICE_CHANGED
  export FRONTEND_CHANGED
fi