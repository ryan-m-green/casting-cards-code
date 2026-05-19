using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using System.Collections.Concurrent;

namespace CastLibrary.Logic.Queries.Library
{
    public class ExportLibraryQuery
    {
        public Guid DmUserId { get; set; }
        public EntityType CardEntityType { get; set; }
        public ConcurrentDictionary<string, byte> UsedFileNames { get; set; }
        public LibraryExportPackage Package { get; set; }
    }
}
