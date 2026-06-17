using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Text;

namespace CastLibrary.Adapter.EmailBuilders
{
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
}
