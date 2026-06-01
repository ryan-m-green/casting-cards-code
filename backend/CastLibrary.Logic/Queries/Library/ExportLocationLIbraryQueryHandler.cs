using CastLibrary.Logic.Factories;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;
using System.Collections.Concurrent;

namespace CastLibrary.Logic.Queries.Library
{
    public interface IExportLocationLibraryQueryHandler
    {
        Task<List<LocationCard>> HandleAsync(ExportLibraryQuery query, ConcurrentDictionary<string, byte[]> imageCollector);
    }
    public class ExportLocationLIbraryQueryHandler(
         ILocationReadRepository locationReadRepository,
        IImageFileNameQueryHandler imageFileNameQueryHandler,
        IImageKeyCreator imageKeyCreator,
        ILocationCardFactory locationCardFactory
        ) : IExportLocationLibraryQueryHandler
    {
        public async Task<List<LocationCard>> HandleAsync(ExportLibraryQuery query, ConcurrentDictionary<string, byte[]> imageCollector)
        {
            var locations = await locationReadRepository.GetAllByDmAsync(query.DmUserId);

            var locationCards = new ConcurrentBag<LocationCard>();

            await Parallel.ForEachAsync(locations, async (location, cancellationToken) =>
             {
                 var imageKey = imageKeyCreator.Create(query.DmUserId, Guid.Empty, location.Id, EntityType.Location);

                 var imageFileName = await imageFileNameQueryHandler.HandleAsync(
                     imageKey, "location", location.Name, query.UsedFileNames, imageCollector);

                 var locationCard = locationCardFactory.Create(location, imageFileName);

                 locationCards.Add(locationCard);
             });

            return locationCards.ToList();
        }
    }
}
