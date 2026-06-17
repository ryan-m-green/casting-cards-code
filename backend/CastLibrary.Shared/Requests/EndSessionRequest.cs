namespace CastLibrary.Shared.Requests;

public class EndSessionRequest
{
    public int EndDay { get; set; }
    public string AlternateTitle { get; set; } = string.Empty;
}
