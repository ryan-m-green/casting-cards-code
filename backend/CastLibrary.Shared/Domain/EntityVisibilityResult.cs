namespace CastLibrary.Shared.Domain
{
    public class EntityVisibilityResult
    {
        public Guid CampaignId { get; set; }
        public Guid EntityInstanceId { get; set; }
        public decimal PositionPercentMoved { get; set; } = 0m;
        public string EventName { get; set; }
        public bool IsVisible { get; set; }
        public string CardType { get; set; } = string.Empty;
        public long TickCount { get; set; }
        public string Title { get; set; }
        public string Body { get; set; }
        public string PlayerCardName { get; set; }
        public string PlayerCardRace { get; set; }
        public string PlayerCardClass { get; set; }
        public string PlayerCardImageUrl { get; set; }

        // Cast travel properties
        public Guid? CastInstanceId { get; set; }
        public Guid? FromSublocationInstanceId { get; set; }
        public Guid? ToLocationInstanceId { get; set; }
        public Guid? ToSublocationInstanceId { get; set; }
        public bool TraveledToTheParty { get; set; }
    }
}
