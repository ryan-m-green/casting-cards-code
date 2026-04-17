using CastLibrary.Logic.Services;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;
using System.IO.Compression;
using System.Text.Json;

namespace CastLibrary.Logic.Commands.Library
{
    public interface IZipLibraryImportCommandHandler
    {
        Task<ImportLibraryResponse> HandleAsync(ZipLibraryImportCommand command);
    }
    public class ZipLibraryImportCommandHandler(
        ILibraryImageExtractionService libraryImageExtractionService,
        IImportLibraryCommandHandler importLibraryCommand) : IZipLibraryImportCommandHandler
    {
        public async Task<ImportLibraryResponse> HandleAsync(ZipLibraryImportCommand command)
        {
            var archive = command.ZipBundle;
            var jsonEntry = archive.GetEntry("library.json")
                                         ?? throw new InvalidOperationException("library.json not found in ZIP.");
            LibraryBundle bundle;
            await using (var jsonStream = jsonEntry.Open())
            {
                bundle = await JsonSerializer.DeserializeAsync<LibraryBundle>(jsonStream, JsonOptions)
                         ?? throw new InvalidOperationException("library.json is empty or invalid.");
            }

            var imageStreams = await libraryImageExtractionService.ExtractImagesAsync(archive);

            var result = await importLibraryCommand
                .HandleAsync(new ImportLibraryCommand(bundle, imageStreams, command.DmUserId));
            return result;
        }

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        };
    }
    public class ZipLibraryImportCommand
    {
        public ZipLibraryImportCommand(Guid dmUserId, ZipArchive zipBundle)
        {
            DmUserId = dmUserId;
            ZipBundle = zipBundle;
        }

        public Guid DmUserId { get; }
        public ZipArchive ZipBundle { get; }
    }
}
