namespace CastLibrary.Shared.Responses;

public class PlayerCastPerceptionResponse
{
    public Guid Id { get; set; }
    public Guid PlayerCardId { get; set; }
    public Guid? CastInstanceId { get; set; }
    public Guid? LocationInstanceId { get; set; }
    public Guid? SublocationInstanceId { get; set; }
    public string Impression { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
