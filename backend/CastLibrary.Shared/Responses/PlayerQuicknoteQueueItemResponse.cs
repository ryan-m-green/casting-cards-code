using CastLibrary.Shared.Domain;

namespace CastLibrary.Shared.Responses;

public class PlayerQuicknoteQueueItemResponse
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string Content { get; set; } = string.Empty;

    /// <summary>The campaign cards the note is linked to: the hashtags it wears in the queue.</summary>
    public List<LinkedEntityTrigger> LinkedEntities { get; set; } = [];

    /// <summary>False means the note will be sent to the chronicle as a GM-only entry.</summary>
    public bool VisibleToPlayers { get; set; } = true;

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
