-- Create the enum type 'coin_status_enum' if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coin_status_enum') THEN
        CREATE TYPE coin_status_enum AS ENUM ('ACTIVE', 'DELISTED');
    END IF;
END $$;

-- Add the 'status' column to the 'coins' table if it doesn't exist
ALTER TABLE coins
ADD COLUMN IF NOT EXISTS status coin_status_enum NOT NULL DEFAULT 'ACTIVE';
