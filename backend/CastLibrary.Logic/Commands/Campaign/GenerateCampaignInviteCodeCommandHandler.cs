using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IGenerateCampaignInviteCodeCommandHandler
{
    Task<CampaignInviteCodeDomain> HandleAsync(GenerateCampaignInviteCodeCommand command);
}

public class GenerateCampaignInviteCodeCommandHandler(
    ICampaignInviteCodeUpdateRepository inviteCodeRepository,
    ISystemValuesService systemValuesService) : IGenerateCampaignInviteCodeCommandHandler
{

    public string GenerateInviteCode()
    {
        var parts = systemValuesService.GetNewGuid().ToString().Split('-');
        return $"{parts[1]}-{parts[2]}-{parts[3]}".ToUpper();
    }

    public async Task<CampaignInviteCodeDomain> HandleAsync(GenerateCampaignInviteCodeCommand command)
    {
        var code = GenerateInviteCode();

        var domain = new CampaignInviteCodeDomain
        {
            CampaignId = command.CampaignId,
            Code = code,
            ExpiresAt = systemValuesService.GetUTCNow(24),
        };

        await inviteCodeRepository.UpsertAsync(domain);
        return domain;
    }
}

public class GenerateCampaignInviteCodeCommand
{
    public GenerateCampaignInviteCodeCommand(Guid campaignId)
    {
        CampaignId = campaignId;
    }
    public Guid CampaignId { get; }
}
