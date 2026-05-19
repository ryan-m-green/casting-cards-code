using CastLibrary.Logic.Services;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using System.Collections.Concurrent;
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
    IExportFactionLibraryQueryHandler exportFactionLibraryQueryHandler,
    ITemplateZipService templateZipService) : IExportLibraryQueryHandler
{
    public async Task<byte[]> HandleAsync(Guid dmUserId)
    {
        var package = new LibraryExportPackage();
        var usedFilenames = new ConcurrentDictionary<string, byte>(StringComparer.OrdinalIgnoreCase);
        var imageCollector = new ConcurrentDictionary<string, byte[]>();

        var libraryQuery = new ExportLibraryQuery()
        {
            DmUserId = dmUserId,
            CardEntityType = EntityType.Cast,
            UsedFileNames = usedFilenames,
            Package = package
        };        

        var castTask = exportCastLibraryQueryHandler.HandleAsync(libraryQuery, imageCollector);
        var sublocationTask = exportSublocationLibraryQueryHandler.HandleAsync(libraryQuery, imageCollector);
        var locationTask = exportLocationLibraryQueryHandler.HandleAsync(libraryQuery, imageCollector);
        var factionTask = exportFactionLibraryQueryHandler.HandleAsync(libraryQuery);
        var taskList = new List<Task>()
        {
            castTask,
            sublocationTask,
            locationTask,
            factionTask
        };

        await Task.WhenAll(taskList);

        package.Bundle.Casts = castTask.Result;
        package.Bundle.Locations = locationTask.Result;
        package.Bundle.Sublocations = sublocationTask.Result;
        package.Bundle.Factions = factionTask.Result;

        var json = JsonSerializer.Serialize(package.Bundle, JsonOptions);
        var zipBytes = templateZipService.GetZip(json, imageCollector.ToDictionary());

        return zipBytes;
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };
}