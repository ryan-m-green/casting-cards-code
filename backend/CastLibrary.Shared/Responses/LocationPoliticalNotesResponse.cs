namespace CastLibrary.Shared.Responses;

public class LocationNpcRoleResponse
{
    public Guid Id { get; set; }
    public Guid CastInstanceId { get; set; }
    public Guid FactionId { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Motivation { get; set; } = string.Empty;
}
