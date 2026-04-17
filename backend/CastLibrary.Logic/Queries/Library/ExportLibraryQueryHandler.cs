using CastLibrary.Logic.Services;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using System.Text.Json;

namespace CastLibrary.Logic.Queries.Library;

public interface IExportLibraryQueryHandler
{
    Task<byte[]> HandleAsync(Guid dmUserId);
}

public class ExportLibraryQueryHandler(
    IExportCastLibraryQueryHandler exportCastLibraryQueryHandler,
    IExportLocationLibraryQueryHandler exportLocationLibraryQueryHandler,
    IExportSublocationLibraryQueryHandler exportSublocationLibraryQueryHandler,
    ITemplateZipService templateZipService) : IExportLibraryQueryHandler
{
    public async Task<byte[]> HandleAsync(Guid dmUserId)
    {
        var package = new LibraryExportPackage();
        var usedFilenames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var libraryQuery = new ExportLibraryQuery()
        {
            DmUserId = dmUserId,
            CardEntityType = EntityType.Cast,
            UsedFileNames = usedFilenames,
            Package = package
        };

        package.Bundle.Casts = await exportCastLibraryQueryHandler.HandleAsync(libraryQuery);

        package.Bundle.Locations = await exportLocationLibraryQueryHandler.HandleAsync(libraryQuery);

        package.Bundle.Sublocations = await exportSublocationLibraryQueryHandler.HandleAsync(libraryQuery);

        var json = JsonSerializer.Serialize(package.Bundle, JsonOptions);
        var zipBytes = templateZipService.GetZip(json, package.Images);

        return zipBytes;
    }
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };
}