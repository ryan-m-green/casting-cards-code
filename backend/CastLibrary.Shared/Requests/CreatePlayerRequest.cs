using System.Text.Json.Serialization;

namespace CastLibrary.Shared.Requests;

public class CreatePlayerRequest
{
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Role { get; set; } = "Player";
    [JsonPropertyName("bypassPayment")]
    public bool BypassPayment { get; set; }
}
