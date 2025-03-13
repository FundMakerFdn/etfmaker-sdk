#!/bin/bash
echo "Initializing PostgreSQL with custom settings..."

# Ensure environment variables are applied to default PostgreSQL startup
export POSTGRES_USER=${POSTGRES_USER}
export POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
export POSTGRES_DB=${POSTGRES_DB}

# Ensure PostgreSQL uses the correct config file
echo "Applying PostgreSQL configuration..."

# Start PostgreSQL normally with default entrypoint
exec docker-entrypoint.sh postgres -c config_file=/etc/postgresql/postgresql.conf
