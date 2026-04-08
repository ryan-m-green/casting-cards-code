namespace CastLibrary.Shared.Responses;

public class ImportLibraryResponse
{
    public int CastsImported { get; set; }
    public int LocationsImported { get; set; }
    public int SublocationsImported { get; set; }
    public List<ImportFailure> Failures { get; set; } = [];
}

public class ImportFailure
{
    public string CardType { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
}
