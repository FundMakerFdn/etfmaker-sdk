export interface PricesDto {
  prices: {
    [timestamp: string]: {
      open: string;
      high: string;
      low: string;
      close: string;
      volume: string;
    };
  }[];
}
