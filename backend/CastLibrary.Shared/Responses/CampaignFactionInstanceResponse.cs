namespace CastLibrary.Shared.Responses;

public class CampaignFactionInstanceResponse
{
    public Guid FactionInstanceId { get; set; }
    public Guid SourceFactionId { get; set; }
    public Guid CampaignId { get; set; }
    public Guid DmUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public short Influence { get; set; }
    public short Perception { get; set; }
    public bool Hidden { get; set; }
    public bool IsVisibleToPlayers { get; set; }
    public string Description { get; set; }
    public string DmNotes { get; set; }
    public string SymbolPath { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<Guid> SubLocationInstanceIds { get; set; } = [];
    public List<Guid> CastInstanceIds { get; set; } = [];
    public Guid? PrimarySublocationInstanceId { get; set; }
    public Guid? PrimaryCastInstanceId { get; set; }
    public List<CampaignFactionRelationshipResponse> FactionRelationships { get; set; } = [];
}
