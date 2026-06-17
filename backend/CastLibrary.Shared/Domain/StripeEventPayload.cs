using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace CastLibrary.Shared.Domain
{
    public class StripeEventPayload
    {
        [JsonProperty("id")]
        public string Id { get; set; }
        [JsonProperty("object")]
        public string Object { get; set; }
        [JsonProperty("api_version")]
        public string ApiVersion { get; set; }
        [JsonProperty("created")]
        public long Created { get; set; }
        [JsonProperty("data")]
        public JToken Data { get; set; }
        [JsonProperty("livemode")]
        public bool LiveMode { get; set; }
        [JsonProperty("pending_webhooks")]
        public int PendingWebhooks { get; set; }
        [JsonProperty("request")]
        public StripeRequest Request { get; set; }
        [JsonProperty("type")]
        public string Type { get; set; }
        public Guid UserId { get; set; }
        public Action<Guid, string> Callback { get; set; }
    }
    public class StripeRequest
    {
        [JsonProperty("id")]
        public string Id { get; set; }
        [JsonProperty("idempotency_key")]
        public string IdempotencyKey { get; set; }
    }
}
