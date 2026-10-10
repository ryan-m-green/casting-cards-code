export interface PurchaseResult {
  success: boolean;
  itemName: string;
  priceAmount: number;
  priceCurrencyType: string;
  playerDisplayName: string;
  denialReason: string;
}
