import { OhclGroupByEnum } from "../enums/OhclGroupBy.enum";

export interface FilterInterface {
  period: "day" | "week" | "month" | "year";
  ohclGroupBy: OhclGroupByEnum;
}
