using Newtonsoft.Json;

namespace CastLibrary.Shared.Requests;

public class SenderEmailRequest
{
    [JsonProperty("from")]
    public SenderRecipient From { get; set; }
    [JsonProperty("to")]
    public SenderRecipient To { get; set; }
    [JsonProperty("subject")]
    public string Subject { get; set; }
    [JsonProperty("html")]
    public string Html { get; set; }
}

public class SenderRecipient
{
    [JsonProperty("email")]
    public string Email { get; set; }
    [JsonProperty("name")]
    public string Name { get; set; }
}
