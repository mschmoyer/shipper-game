#!/bin/bash
set -e

host="$1"
shift
cmd="$@"

echo "Starting init-db.sh script"

until pg_isready -h "$host" -p 5432; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up - running init-db.sh"

echo "Starting init-db.sh script"
echo "POSTGRES_USER: $POSTGRES_USER"
echo "POSTGRES_PASSWORD: $POSTGRES_PASSWORD"

export PGPASSWORD="$POSTGRES_PASSWORD"

psql -v ON_ERROR_STOP=1 --host=db --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'shipper_user') THEN
            CREATE USER shipper_user WITH PASSWORD 'superHardPasswordToGuess';
        END IF;
    END
    \$\$;
    GRANT ALL PRIVILEGES ON DATABASE shipper_game TO shipper_user;
EOSQL

echo "Running resetDatabase.js script"
node /app/server/scripts/resetDatabase.js

>&2 echo "init-db.sh completed - executing command $cmd"
exec $cmd