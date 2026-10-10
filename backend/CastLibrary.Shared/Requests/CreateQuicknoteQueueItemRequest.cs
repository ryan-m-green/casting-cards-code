using QuicknoteLinkedEntity = CastLibrary.Shared.Domain.LinkedEntityTrigger;

namespace CastLibrary.Shared.Requests;

public class CreateQuicknoteQueueItemRequest
{
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// The campaign cards the note is linked to: the hashtags it wears while it sits in the queue,
    /// carried to the chronicle as its participants when the note is sent on. (Aliased because this
    /// namespace carries a LinkedEntityTrigger of its own, which would otherwise shadow the domain's.)
    /// </summary>
    public List<QuicknoteLinkedEntity> LinkedEntities { get; set; } = [];

    /// <summary>False sends the note to the chronicle as a GM-only entry.</summary>
    public bool VisibleToPlayers { get; set; } = true;
}
