import { actualizeCoinData } from "../actualization/actualization.controller";
import { RoutesType } from "../interfaces/RoutesType";

export const ActualizationRoutes = [
  {
    method: "POST",
    url: "/actualize-coindata",
    handler: actualizeCoinData,
  },
] satisfies RoutesType[];
