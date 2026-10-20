#!/usr/bin/env bash
# Starts the PHP API on http://127.0.0.1:8090 against a separate TEST database
# (awarenessalert_test) and loads the demo data. Your real XAMPP data is not touched.
# post_max_size=40M matches the XAMPP default, so 10 MB photos (sent as base64) fit.
set -euo pipefail
export DB_HOST="${DB_HOST:-127.0.0.1}" DB_NAME="${DB_NAME:-awarenessalert_test}" DB_USER="${DB_USER:-root}" DB_PASS="${DB_PASS:-}"
PORT="${API_PORT:-8090}"
PHP_CLI_SERVER_WORKERS="${PHP_CLI_SERVER_WORKERS:-8}" php -d post_max_size=40M -d upload_max_filesize=40M -d memory_limit=512M -S 127.0.0.1:"$PORT" -t Backend/awarenessalert-api > /tmp/aa-test-api.log 2>&1 &
echo $! > /tmp/aa-test-api.pid
for i in $(seq 1 30); do curl -s -o /dev/null "http://127.0.0.1:$PORT/api.php" && break; sleep 0.5; done
curl -s "http://127.0.0.1:$PORT/setup.php?reset=1" | grep -q "Setup complete" && echo "Test API ready on http://127.0.0.1:$PORT (database $DB_NAME)"
