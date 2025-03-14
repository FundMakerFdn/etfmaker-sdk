import { enumToPgEnum } from "../../helpers/EnumToPg";
import { ProcessingStatusEnum } from "../../enums/Processing.enum";
import {
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const ProcessingStatusEnumPg = enumToPgEnum(
  "processing_status_enum",
  ProcessingStatusEnum
);

export const ProcessingStatus = pgTable(
  "processing_status",
  {
    id: serial("id").notNull(),
    key: text("key").notNull(),
    status: ProcessingStatusEnumPg("status").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.timestamp] }),
    };
  }
);
