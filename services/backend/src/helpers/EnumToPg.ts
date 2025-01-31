import { pgEnum } from "drizzle-orm/pg-core";

export const enumToPgEnum = <T extends Record<string, string>>(
  pgEnumName: string,
  enumObj: T
) => {
  return pgEnum(pgEnumName, Object.values(enumObj) as [string, ...string[]]);
};
