using CastLibrary.Logic.Factories;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Queries.Library
{
    public interface IExportSublocationLibraryQueryHandler
    {
        Task<List<SublocationCard>> HandleAsync(ExportLibraryQuery query);
    }
    public class ExportSublocationLibraryQueryHandler(
            ISublocationReadRepository sublocationReadRepository,
        IImageFileNameQueryHandler imageFileNameQueryHandler,
        IImageKeyCreator imageKeyCreator,
        ISublocationCardFactory sublocationCardFactory
        ) : IExportSublocationLibraryQueryHandler
    {
        public async Task<List<SublocationCard>> HandleAsync(ExportLibraryQuery query)
        {
            var sublocations = await sublocationReadRepository.GetAllByDmAsync(query.DmUserId);

            var sublocationCards = new List<SublocationCard>();

            foreach (var sublocation in sublocations)
            {
                var imageKey = imageKeyCreator.Create(query.DmUserId, sublocation.Id, EntityType.Sublocation);

                var imageFileName = await imageFileNameQueryHandler.HandleAsync(
                    imageKey, "subloc", sublocation.Name, query.UsedFileNames, query.Package.Images);

                var sublocationCard = sublocationCardFactory.Create(sublocation, imageFileName);
                sublocationCards.Add(sublocationCard);
            }
            return sublocationCards;
        }
    }
}
