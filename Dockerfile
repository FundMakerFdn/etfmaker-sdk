FROM node:20.7.0

WORKDIR /app

COPY package.json  package-lock.json ./

RUN npm install

# Copy the custom configuration files into the image
COPY pg-config/postgresql.conf /etc/postgresql/postgresql.conf
COPY pg-config/pg_hba.conf /etc/postgresql/pg_hba.conf

# Set the proper permissions
RUN chmod 644 /etc/postgresql/postgresql.config
RUN chmod 644 /etc/postgresql/pg_hba.conf
RUN chmod 1777 /tmp

COPY . .

EXPOSE ${APP_PORT}
