namespace CastLibrary.Shared.Responses;

public class ImportLibraryResponse
{
    public int CastsImported { get; set; }
    public int LocationsImported { get; set; }
    public int SublocationsImported { get; set; }
    public int CastsSkipped { get; set; }
    public int LocationsSkipped { get; set; }
    public int SublocationsSkipped { get; set; }
    public int FactionsImported { get; set; }
    public int FactionsSkipped { get; set; }
    public List<ImportFailure> Failures { get; set; } = [];
}
public class ImportRecord
{
    public int NumberImported { get; set; }
    public int NumberSkipped { get; set; }
    public List<ImportFailure> Failures { get; set; }
}
public class ImportFailure
{
    public string CardType { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
}
