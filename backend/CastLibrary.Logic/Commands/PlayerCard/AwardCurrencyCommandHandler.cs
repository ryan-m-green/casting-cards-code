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
            var players = await campaignPlayerReadRepository.GetByCampaignAsync(command.CampaignId);

            foreach (var player in players)
            {
                await goldTransactionInsertRepository.InsertAsync(new GoldTransactionDomain
                {
                    Id = Guid.NewGuid(),
                    CampaignId = command.CampaignId,
                    PlayerUserId = player.UserId,
                    Amount = command.Request.Amount,
                    Currency = command.Request.Currency,
                    TransactionType = TransactionType.DM_GRANT,
                    Description = command.Request.Note ?? string.Empty,
                    CreatedBy = command.RequestingUserId,
                    CreatedAt = systemValuesService.GetUTCNow(),
                });
            }

            return new AwardCurrencyResult
            {
                TargetPlayerUserId = null,
                Amount = command.Request.Amount,
                Currency = command.Request.Currency,
                Note = command.Request.Note,
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

public class AwardCurrencyResult
{
    public Guid? TargetPlayerUserId { get; set; }
    public int Amount { get; set; }
    public string Currency { get; set; } = "gp";
    public string? Note { get; set; }
}
