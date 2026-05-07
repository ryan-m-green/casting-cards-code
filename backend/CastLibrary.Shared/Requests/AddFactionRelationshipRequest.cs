namespace CastLibrary.Shared.Requests;

public class AddFactionRelationshipRequest
{
    public Guid FactionInstanceIdA { get; set; }
    public Guid FactionInstanceIdB { get; set; }
    public string RelationshipType { get; set; } = string.Empty;
    public short Strength { get; set; }
}
