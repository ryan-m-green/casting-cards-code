using System.Text.Json.Serialization;

namespace CastLibrary.Shared.Domain;
public class StopWordsDomain
{
    [JsonPropertyName("words")]
    public string[] Words { get; set; } = [];
}
