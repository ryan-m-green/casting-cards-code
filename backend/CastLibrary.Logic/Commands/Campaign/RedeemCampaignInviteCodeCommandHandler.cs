using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public record RedeemCampaignInviteCodeResult(CampaignDomain Campaign, CampaignPlayerDomain Player);

public interface IRedeemCampaignInviteCodeCommandHandler
{
    /// <returns>The campaign and player that joined, or null if the code was invalid/expired.</returns>
    Task<RedeemCampaignInviteCodeResult?> HandleAsync(RedeemCampaignInviteCodeCommand command);
}

public class RedeemCampaignInviteCodeCommandHandler(
    ICampaignInviteCodeReadRepository inviteCodeRepository,
    ICampaignPlayerReadRepository playerReadRepository,
    ICampaignPlayerInsertRepository playerInsertRepository,
    ICampaignReadRepository campaignRepository) : IRedeemCampaignInviteCodeCommandHandler
{
    public async Task<RedeemCampaignInviteCodeResult?> HandleAsync(RedeemCampaignInviteCodeCommand command)
    {
        var invite = await inviteCodeRepository.GetByCodeAsync(command.Request.Code);
        if (invite is null) return null;

        var alreadyJoined = await playerReadRepository.IsPlayerInCampaignAsync(invite.CampaignId, command.PlayerUserId);
        if (!alreadyJoined)
            await playerInsertRepository.InsertCampaignPlayerAsync(invite.CampaignId, command.PlayerUserId);

        var campaign = await campaignRepository.GetByIdAsync(invite.CampaignId);
        var player   = await playerReadRepository.GetByUserAndCampaignAsync(invite.CampaignId, command.PlayerUserId);

        return new RedeemCampaignInviteCodeResult(campaign, player!);
    }
}

public class RedeemCampaignInviteCodeCommand
{
    public RedeemCampaignInviteCodeCommand(Guid playerUserId, RedeemInviteCodeRequest request)
    {
        PlayerUserId = playerUserId;
        Request = request;
    }
    public Guid PlayerUserId { get; }
    public RedeemInviteCodeRequest Request { get; }
}