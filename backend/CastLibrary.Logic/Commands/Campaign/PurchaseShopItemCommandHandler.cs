using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IPurchaseShopItemCommandHandler
{
    Task<PurchaseShopItemResponse> HandleAsync(PurchaseShopItemCommand command);
}

public class PurchaseShopItemCommandHandler(
    ICampaignReadRepository campaignReadRepository,
    ICampaignPlayerReadRepository campaignPlayerReadRepository,
    ICurrencyBalanceReadRepository currencyBalanceReadRepository,
    ICurrencyTransactionUpdateRepository currencyTransactionUpdateRepository) : IPurchaseShopItemCommandHandler
{
    // D&D 5e exchange rates in copper pieces (low → high)
    private static readonly string[] CoinOrder = ["cp", "sp", "ep", "gp", "pp"];

    private static readonly Dictionary<string, int> CopperValue = new(StringComparer.OrdinalIgnoreCase)
    {
        ["cp"] = 1,
        ["sp"] = 10,
        ["ep"] = 50,
        ["gp"] = 100,
        ["pp"] = 1000,
    };

    public async Task<PurchaseShopItemResponse> HandleAsync(PurchaseShopItemCommand command)
    {
        // Load the sublocation instance and find the item
        var sublocation = await campaignReadRepository.GetSublocationInstanceByIdAsync(command.SublocationInstanceId);
        if (sublocation is null || sublocation.CampaignId != command.CampaignId)
            return Denied("Shop not found.", string.Empty, 0, string.Empty);

        var item = sublocation.ShopItems.FirstOrDefault(s => s.Id == command.ShopItemId);
        if (item is null)
            return Denied("Item not found.", string.Empty, 0, string.Empty);

        // Load player
        var player = await campaignPlayerReadRepository.GetByUserAndCampaignAsync(command.CampaignId, command.PlayerUserId);
        if (player is null)
            return Denied("Player not found in campaign.", item.Name, item.PriceAmount, item.PriceCurrencyType);

        if (!CopperValue.TryGetValue(item.PriceCurrencyType, out var cpPerItemUnit))
            return Denied("Unknown currency type on item.", item.Name, item.PriceAmount, item.PriceCurrencyType);

        var rawBalances = await currencyBalanceReadRepository.GetByPlayerAsync(command.CampaignId, command.PlayerUserId);

        // Ensure all 5 coins are present in the working copy
        var bal = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var coin in CoinOrder)
            bal[coin] = rawBalances.TryGetValue(coin, out var v) ? v : 0;

        var C = item.PriceCurrencyType.ToLowerInvariant();
        var X = item.PriceAmount;

        // ── Step 1: direct match ─────────────────────────────────────────────
        if (bal[C] >= X)
        {
            bal[C] -= X;
            await currencyTransactionUpdateRepository.SetAmountAsync(command.CampaignId, command.PlayerUserId, C, bal[C]);
            return Success(item, player);
        }

        // ── Step 2: exchange from higher denominations, one unit at a time ───
        var working = new Dictionary<string, int>(bal, StringComparer.OrdinalIgnoreCase);
        var cIndex  = Array.FindIndex(CoinOrder, c => c.Equals(C, StringComparison.OrdinalIgnoreCase));
        var changed = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { C };

        for (var i = cIndex + 1; i < CoinOrder.Length; i++)
        {
            var D            = CoinOrder[i];
            var exchangeRate = CopperValue[D] / cpPerItemUnit; // units of C per 1 unit of D

            while (working[D] > 0)
            {
                working[D]--;
                working[C] += exchangeRate;
                changed.Add(D);

                if (working[C] >= X)
                {
                    working[C] -= X;
                    foreach (var coin in changed)
                        await currencyTransactionUpdateRepository.SetAmountAsync(
                            command.CampaignId, command.PlayerUserId, coin, working[coin]);
                    return Success(item, player);
                }
            }
        }

        // ── Step 3: copper fallback — compare totals, redistribute optimally ─
        var totalCp = CoinOrder.Sum(coin => bal[coin] * CopperValue[coin]);
        var costCp  = X * cpPerItemUnit;

        if (totalCp < costCp)
            return Denied(string.Empty, item.Name, item.PriceAmount, item.PriceCurrencyType);

        var remainderCp = totalCp - costCp;
        foreach (var coin in CoinOrder.Reverse())
        {
            var rate    = CopperValue[coin];
            var newAmt  = remainderCp / rate;
            remainderCp %= rate;
            await currencyTransactionUpdateRepository.SetAmountAsync(
                command.CampaignId, command.PlayerUserId, coin, newAmt);
        }

        return Success(item, player);
    }

    private static PurchaseShopItemResponse Success(ShopItemDomain item, CampaignPlayerDomain player) =>
        new()
        {
            Success           = true,
            ItemName          = item.Name,
            PriceAmount       = item.PriceAmount,
            PriceCurrencyType = item.PriceCurrencyType,
            PlayerDisplayName = player.DisplayName,
        };


    private static PurchaseShopItemResponse Denied(string reason, string itemName, int priceAmount, string priceCurrencyType) =>
        new()
        {
            Success           = false,
            ItemName          = itemName,
            PriceAmount       = priceAmount,
            PriceCurrencyType = priceCurrencyType,
            DenialReason      = reason,
        };
}

public class PurchaseShopItemCommand
{
    public PurchaseShopItemCommand(Guid campaignId, Guid sublocationInstanceId, Guid shopItemId, Guid playerUserId)
    {
        CampaignId            = campaignId;
        SublocationInstanceId = sublocationInstanceId;
        ShopItemId            = shopItemId;
        PlayerUserId          = playerUserId;
    }

    public Guid CampaignId            { get; }
    public Guid SublocationInstanceId { get; }
    public Guid ShopItemId            { get; }
    public Guid PlayerUserId          { get; }
}
