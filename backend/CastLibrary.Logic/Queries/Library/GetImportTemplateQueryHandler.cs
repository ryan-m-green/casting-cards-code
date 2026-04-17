using CastLibrary.Logic.Factories;
using CastLibrary.Logic.Services;
using System.Text.Json;

namespace CastLibrary.Logic.Queries.Library
{
    public interface IGetImportTemplateQueryHandler
    {
        Task<byte[]> HandleAsync();
    }

    public class GetImportTemplateQueryHandler(
        ILibraryBundleTemplateFactory templateFactory,
        ITemplateReadMeFactory templateReadMeFactory,
        ITemplateZipService templateZipService) : IGetImportTemplateQueryHandler
    {
        public async Task<byte[]> HandleAsync()
        {
            var template = templateFactory.Create();
            var templateJson = JsonSerializer.Serialize(template, new JsonSerializerOptions { WriteIndented = true });
            var readMe = templateReadMeFactory.Create();

            var zipContainer = templateZipService.GetZip(templateJson, readMe);
            return await Task.FromResult(zipContainer);
        }
    }
}