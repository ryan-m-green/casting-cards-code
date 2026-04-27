namespace CastLibrary.Shared.Requests;

public class TravelCastRequest
{
    public Guid LocationInstanceId { get; set; }
    public Guid SublocationInstanceId { get; set; }
    public Guid? FromSublocationInstanceId { get; set; }
}
