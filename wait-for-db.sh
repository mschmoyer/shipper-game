#!/bin/sh
# wait-for-db.sh

set -e

host="$1"
shift
cmd="$@"

echo "Starting wait-for-db.sh script"

until pg_isready -h "$host" -p 5432; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up - running init-db.sh"
/app/init-db.sh

>&2 echo "init-db.sh completed - executing command"
exec $cmd