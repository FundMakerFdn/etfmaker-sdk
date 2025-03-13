import { enumToPgEnum } from "../../helpers/EnumToPg";
import { ProcessingStatusEnum } from "../../enums/Processing.enum";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const ProcessingStatusEnumPg = enumToPgEnum(
  "processing_status_enum",
  ProcessingStatusEnum
);

export const ProcessingStatus = pgTable("processing_status", {
  id: serial("id").primaryKey(),
  key: text("key").notNull(),
  status: ProcessingStatusEnumPg("status").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});
