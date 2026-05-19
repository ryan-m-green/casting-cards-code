using CastLibrary.Logic.Factories;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;
using System.Collections.Concurrent;

namespace CastLibrary.Logic.Queries.Library
{
    public interface IExportSublocationLibraryQueryHandler
    {
        Task<List<SublocationCard>> HandleAsync(ExportLibraryQuery query, ConcurrentDictionary<string, byte[]> imageCollector);
    }
    public class ExportSublocationLibraryQueryHandler(
            ISublocationReadRepository sublocationReadRepository,
        IImageFileNameQueryHandler imageFileNameQueryHandler,
        IImageKeyCreator imageKeyCreator,
        ISublocationCardFactory sublocationCardFactory
        ) : IExportSublocationLibraryQueryHandler
    {
        public async Task<List<SublocationCard>> HandleAsync(ExportLibraryQuery query, ConcurrentDictionary<string, byte[]> imageCollector)
        {
            var sublocations = await sublocationReadRepository.GetAllByDmAsync(query.DmUserId);

            var sublocationCards = new ConcurrentBag<SublocationCard>();

            await Parallel.ForEachAsync(sublocations, async (sublocation, cancellationToken) =>
             {
                 var imageKey = imageKeyCreator.Create(query.DmUserId, sublocation.Id, EntityType.Sublocation);

                 var imageFileName = await imageFileNameQueryHandler.HandleAsync(
                     imageKey, "subloc", sublocation.Name, query.UsedFileNames, imageCollector);

                 var sublocationCard = sublocationCardFactory.Create(sublocation, imageFileName);

                 sublocationCards.Add(sublocationCard);
             });

            return sublocationCards.ToList();
        }
    }
}
