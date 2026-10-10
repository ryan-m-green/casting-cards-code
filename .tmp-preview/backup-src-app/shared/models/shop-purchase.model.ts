/**
 * The shop's own answer to a purchase: what was bought, for how much and by whom, or — when it did
 * not go through — what the shop said about it.
 *
 * Written by the server (see PurchaseShopItemCommandHandler) and read by everything that shows the
 * outcome: the campaign shell's receipt (see cc-purchase-receipt, and the v2 shell's
 * `purchaseReceipt`), the shop's own purchase panel that raises it, and the v1 player page's popup.
 *
 * `denialReason` is empty when the purse simply did not cover the price — the server leaves it out
 * for that case — so anything drawing it should say as much itself rather than show a blank notice.
 */
export interface PurchaseResult {
  success: boolean;
  itemName: string;
  priceAmount: number;
  priceCurrencyType: string;
  playerDisplayName: string;
  denialReason: string;
}
