CREATE TABLE "index_processing_status" (
	"id" serial NOT NULL,
	"etf_id" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text NOT NULL
);
