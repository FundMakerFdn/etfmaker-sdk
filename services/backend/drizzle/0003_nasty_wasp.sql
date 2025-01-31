CREATE TYPE "public"."futures_type_enum" AS ENUM('PERPETUAL', 'CURRENT_QUARTER', 'NEXT_QUARTER');--> statement-breakpoint
ALTER TABLE "coins" ADD COLUMN "futures_type" "futures_type_enum";