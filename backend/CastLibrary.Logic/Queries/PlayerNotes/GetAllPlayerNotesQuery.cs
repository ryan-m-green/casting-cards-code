namespace CastLibrary.Logic.Queries.PlayerNotes;

public class GetAllPlayerNotesQuery
{
    public GetAllPlayerNotesQuery(Guid campaignId) => CampaignId = campaignId;
    public Guid CampaignId { get; }
}
