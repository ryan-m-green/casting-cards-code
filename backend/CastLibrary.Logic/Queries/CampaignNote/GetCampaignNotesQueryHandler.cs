using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Queries.CampaignNote;

public interface IGetCampaignNotesQueryHandler
{
    Task<List<CampaignNoteDomain>> HandleAsync(Guid campaignId, EntityType entityType, Guid instanceId);
}
public class GetCampaignNotesQueryHandler(INoteReadRepository noteRepository) : IGetCampaignNotesQueryHandler
{
    public Task<List<CampaignNoteDomain>> HandleAsync(Guid campaignId, EntityType entityType, Guid instanceId) =>
        noteRepository.GetByEntityAsync(campaignId, entityType.ToString(), instanceId);
}
