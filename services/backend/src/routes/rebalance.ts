import { RoutesType } from "../interfaces/RoutesType";
import {
  getRebalanceAssets,
  generateRebalanceData,
  getRebalanceDataCsv,
  getSimulatedRebalanceDataCsv,
  precalculateRebalanceData,
  getRebalanceCategoriesList,
} from "../rebalance/rebalance.controller";

export const RebalanceRoutes = [
  {
    method: "GET",
    url: "/get-rebalance-assets",
    handler: getRebalanceAssets,
  },
  {
    method: "POST",
    url: "/generate-rebalance-data",
    handler: generateRebalanceData,
  },
  {
    method: "GET",
    url: "/get-rebalance-data-csv",
    handler: getRebalanceDataCsv,
  },
  {
    method: "GET",
    url: "/get-simulated-rebalance-data-csv",
    handler: getSimulatedRebalanceDataCsv,
  },
  {
    method: "POST",
    url: "/precalculate-rebalance-data",
    handler: precalculateRebalanceData,
  },
  {
    method: "GET",
    url: "/get-rebalance-categories",
    handler: getRebalanceCategoriesList,
  },
] satisfies RoutesType[];
