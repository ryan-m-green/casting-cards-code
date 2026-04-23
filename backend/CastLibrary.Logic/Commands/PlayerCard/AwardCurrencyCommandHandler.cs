using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.PlayerCard;

public interface IAwardCurrencyCommandHandler
{
    Task<AwardCurrencyResult> HandleAsync(AwardCurrencyCommand command);
}

public class AwardCurrencyCommandHandler(
    IPlayerCardReadRepository playerCardReadRepository,
    ICampaignPlayerReadRepository campaignPlayerReadRepository,
    IGoldTransactionInsertRepository goldTransactionInsertRepository,
    ISystemValuesService systemValuesService) : IAwardCurrencyCommandHandler
{
    public async Task<AwardCurrencyResult> HandleAsync(AwardCurrencyCommand command)
    {
        if (command.Request.PlayerCardId.HasValue)
        {
            var card = await playerCardReadRepository.GetByIdAsync(command.Request.PlayerCardId.Value);
            if (card is null || card.CampaignId != command.CampaignId) return null;

            await goldTransactionInsertRepository.InsertAsync(new GoldTransactionDomain
            {
                Id = Guid.NewGuid(),
                CampaignId = command.CampaignId,
                PlayerUserId = card.PlayerUserId,
                Amount = command.Request.Amount,
                Currency = command.Request.Currency,
                TransactionType = TransactionType.DM_GRANT,
                Description = command.Request.Note ?? string.Empty,
                CreatedBy = command.RequestingUserId,
                CreatedAt = systemValuesService.GetUTCNow(),
            });

            return new AwardCurrencyResult
            {
                TargetPlayerUserId = card.PlayerUserId,
                Amount = command.Request.Amount,
                Currency = command.Request.Currency,
                Note = command.Request.Note,
            };
        }
        else
        {
            var players = (await campaignPlayerReadRepository.GetByCampaignAsync(command.CampaignId)).ToList();
            if (players.Count == 0) return null;

            var share = command.Request.Amount / players.Count;
            var remainder = command.Request.Amount % players.Count;
            var choices = Enumerable.Range(0, players.Count).ToArray();
            var bonusIndices = Random.Shared.GetItems(choices, remainder).ToHashSet();
            var now = systemValuesService.GetUTCNow();
            var awards = new List<PlayerAwardSplit>();

            for (var i = 0; i < players.Count; i++)
            {
                var playerAmount = share + (bonusIndices.Contains(i) ? 1 : 0);
                if (playerAmount == 0) continue;

                await goldTransactionInsertRepository.InsertAsync(new GoldTransactionDomain
                {
                    Id = Guid.NewGuid(),
                    CampaignId = command.CampaignId,
                    PlayerUserId = players[i].UserId,
                    Amount = playerAmount,
                    Currency = command.Request.Currency,
                    TransactionType = TransactionType.DM_GRANT,
                    Description = command.Request.Note ?? string.Empty,
                    CreatedBy = command.RequestingUserId,
                    CreatedAt = now,
                });

                awards.Add(new PlayerAwardSplit(players[i].UserId, playerAmount));
            }

            return new AwardCurrencyResult
            {
                TargetPlayerUserId = null,
                Amount = command.Request.Amount,
                Currency = command.Request.Currency,
                Note = command.Request.Note,
                PlayerAwards = awards,
            };
        }
    }
}

public class AwardCurrencyCommand
{
    public AwardCurrencyCommand(Guid campaignId, Guid requestingUserId, AwardCurrencyRequest request)
    {
        CampaignId = campaignId;
        RequestingUserId = requestingUserId;
        Request = request;
    }

    public Guid CampaignId { get; }
    public Guid RequestingUserId { get; }
    public AwardCurrencyRequest Request { get; }
}

public record PlayerAwardSplit(Guid PlayerUserId, int Amount);

public class AwardCurrencyResult
{
    public Guid? TargetPlayerUserId { get; set; }
    public int Amount { get; set; }
    public string Currency { get; set; } = "gp";
    public string? Note { get; set; }
    public List<PlayerAwardSplit> PlayerAwards { get; set; } = [];
}
