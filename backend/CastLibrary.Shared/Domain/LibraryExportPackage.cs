using CastLibrary.Shared.Requests;

namespace CastLibrary.Shared.Domain;

public class LibraryExportPackage
{
    public LibraryBundle Bundle { get; set; } = new();
    public Dictionary<string, byte[]> Images { get; set; } = [];
}
