using CastLibrary.Shared.Enums;

namespace CastLibrary.Shared.Requests;

public class UpsertPlayerCastPerceptionRequest
{
    public Guid? CastInstanceId { get; set; }
    public Guid? LocationInstanceId { get; set; }
    public Guid? SublocationInstanceId { get; set; }
    public string Impression { get; set; } = string.Empty;
}
