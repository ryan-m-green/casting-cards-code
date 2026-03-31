using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IRedeemCampaignInviteCodeCommandHandler
{
    /// <returns>The campaign the player joined, or null if the code was invalid/expired.</returns>
    Task<CampaignDomain> HandleAsync(RedeemCampaignInviteCodeCommand command);
}

public class RedeemCampaignInviteCodeCommandHandler(
    ICampaignInviteCodeReadRepository inviteCodeRepository,
    ICampaignPlayerReadRepository playerReadRepository,
    ICampaignPlayerInsertRepository playerInsertRepository,
    ICampaignReadRepository campaignRepository) : IRedeemCampaignInviteCodeCommandHandler
{
    public async Task<CampaignDomain> HandleAsync(RedeemCampaignInviteCodeCommand command)
    {
        var invite = await inviteCodeRepository.GetByCodeAsync(command.Request.Code);
        if (invite is null) return null;

        var alreadyJoined = await playerReadRepository.IsPlayerInCampaignAsync(invite.CampaignId, command.PlayerUserId);
        if (!alreadyJoined)
            await playerInsertRepository.InsertCampaignPlayerAsync(invite.CampaignId, command.PlayerUserId);

        return await campaignRepository.GetByIdAsync(invite.CampaignId);
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