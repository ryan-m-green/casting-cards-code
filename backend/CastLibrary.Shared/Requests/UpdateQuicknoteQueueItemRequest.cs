using QuicknoteLinkedEntity = CastLibrary.Shared.Domain.LinkedEntityTrigger;

namespace CastLibrary.Shared.Requests;

/// <summary>
/// One queued note changed. A field left out is left as it is: the v1 quicknotes bar and the v1
/// queue page send the note's words alone, and a save from them must not wipe the hashtags or the
/// visibility a v2 screen gave the note.
/// </summary>
public class UpdateQuicknoteQueueItemRequest
{
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// The campaign cards the note is linked to: the hashtags it wears while it sits in the queue,
    /// carried to the chronicle as its participants when the note is sent on. Omitted = unchanged;
    /// an empty list takes every link off.
    /// </summary>
    public List<QuicknoteLinkedEntity>? LinkedEntities { get; set; }

    /// <summary>False sends the note to the chronicle as a GM-only entry. Omitted = unchanged.</summary>
    public bool? VisibleToPlayers { get; set; }
}
