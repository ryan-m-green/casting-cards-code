using CastLibrary.Shared.Enums;
namespace CastLibrary.Shared.Requests;

public class AddCampaignSecretRequest
{
    public EntityType EntityType { get; set; }
    public Guid InstanceId { get; set; }
    public string Content { get; set; } = string.Empty;
}
