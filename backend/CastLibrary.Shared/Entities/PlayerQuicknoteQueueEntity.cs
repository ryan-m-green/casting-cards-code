namespace CastLibrary.Shared.Entities;

public class PlayerQuicknoteQueueEntity
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid PlayerUserId { get; set; }
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// V2 - the campaign cards this queued note is linked to (its hashtags), held as the raw
    /// jsonb text the column carries, the way campaign_chronicles carries its own.
    /// </summary>
    public string LinkedEntities { get; set; } = "[]";

    /// <summary>V2 - false sends the note to the chronicle as a GM-only entry.</summary>
    public bool VisibleToPlayers { get; set; } = true;

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
