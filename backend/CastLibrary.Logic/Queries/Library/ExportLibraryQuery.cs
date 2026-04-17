using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Queries.Library
{
    public class ExportLibraryQuery
    {
        public Guid DmUserId { get; set; }
        public EntityType CardEntityType { get; set; }
        public HashSet<string> UsedFileNames { get; set; }
        public LibraryExportPackage Package { get; set; }
    }
}
