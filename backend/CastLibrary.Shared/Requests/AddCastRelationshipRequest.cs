namespace CastLibrary.Shared.Requests;

public class AddCastRelationshipRequest
{
    public Guid SourceCastInstanceId { get; set; }
    public Guid TargetCastInstanceId { get; set; }
    public int Value { get; set; }
    public string? Explanation { get; set; }
}
