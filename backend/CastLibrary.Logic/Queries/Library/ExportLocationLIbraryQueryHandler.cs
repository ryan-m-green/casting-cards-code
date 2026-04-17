using CastLibrary.Logic.Factories;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Queries.Library
{
    public interface IExportLocationLibraryQueryHandler
    {
        Task<List<LocationCard>> HandleAsync(ExportLibraryQuery query);
    }
    public class ExportLocationLIbraryQueryHandler(
         ILocationReadRepository locationReadRepository,
        IImageFileNameQueryHandler imageFileNameQueryHandler,
        IImageKeyCreator imageKeyCreator,
        ILocationCardFactory locationCardFactory
        ) : IExportLocationLibraryQueryHandler
    {
        public async Task<List<LocationCard>> HandleAsync(ExportLibraryQuery query)
        {
            var locations = await locationReadRepository.GetAllByDmAsync(query.DmUserId);

            var locationCards = new List<LocationCard>();

            foreach (var location in locations)
            {
                var imageKey = imageKeyCreator.Create(query.DmUserId, location.Id, query.CardEntityType);

                var imageFileName = await imageFileNameQueryHandler.HandleAsync(
                    imageKey, "cast", location.Name, query.UsedFileNames, query.Package.Images);

                var locationCard = locationCardFactory.Create(location, imageFileName);
                locationCards.Add(locationCard);
            }
            return locationCards;
        }
    }
}
