namespace CastLibrary.Shared.Domain;

public class PlayerQuicknoteQueueDomain
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public Guid PlayerUserId { get; set; }
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// V2 - the campaign cards this queued note is linked to: the hashtags the note wears in the
    /// quicknotes area, carried to the chronicle as its participants when the note is sent.
    /// </summary>
    public List<LinkedEntityTrigger> LinkedEntities { get; set; } = [];

    /// <summary>V2 - false sends the note to the chronicle as a GM-only entry.</summary>
    public bool VisibleToPlayers { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
