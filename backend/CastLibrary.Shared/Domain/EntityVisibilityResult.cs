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
        public string? Title { get; set; }
        public string? Body { get; set; }
    }
}
