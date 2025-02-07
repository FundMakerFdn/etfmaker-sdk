


### Running locally

1. Install dependencies: `npm install` from root directory.

2. Run migrations: `npx drizzle-kit migrate` from services/backend directory.

3. Bring-up the stack, this command will run Docker Compose: `npm run start` from root directory.


### Generate migrations

1. `npx drizzle-kit generate` from root directory.


### Blacklisting assets
    To blacklist an asset, add its symbol as a string to the /services/backend.json file. 
    During the next rebalancing, all coins with blacklisted symbols will be skipped.