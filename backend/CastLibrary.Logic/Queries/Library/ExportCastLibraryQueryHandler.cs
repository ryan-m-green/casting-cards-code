using CastLibrary.Logic.Factories;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Queries.Library
{
    public interface IExportCastLibraryQueryHandler
    {
        Task<List<CastCard>> HandleAsync(ExportLibraryQuery query);
    }

    public class ExportCastLibraryQueryHandler(
        ICastReadRepository castReadRepository,
        IImageFileNameQueryHandler imageFileNameQueryHandler,
        IImageKeyCreator imageKeyCreator,
        ICastCardFactory castCardFactory) : IExportCastLibraryQueryHandler
    {
        public async Task<List<CastCard>> HandleAsync(ExportLibraryQuery query)
        {
            var casts = await castReadRepository.GetAllByDmAsync(query.DmUserId);

            var castCardCollection = new List<CastCard>();
            foreach (var cast in casts)
            {
                var imageKey = imageKeyCreator.Create(query.DmUserId, cast.Id, query.CardEntityType);

                var imageFileName = await imageFileNameQueryHandler.HandleAsync(
                    imageKey, "cast", cast.Name, query.UsedFileNames, query.Package.Images);

                var card = castCardFactory.Create(cast, imageFileName);
                castCardCollection.Add(card);
            }
            return castCardCollection;
        }
    }
}
