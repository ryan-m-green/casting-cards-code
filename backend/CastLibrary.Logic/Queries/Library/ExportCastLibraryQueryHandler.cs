using CastLibrary.Logic.Factories;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;
using System.Collections.Concurrent;

namespace CastLibrary.Logic.Queries.Library
{
    public interface IExportCastLibraryQueryHandler
    {
        Task<List<CastCard>> HandleAsync(ExportLibraryQuery query, ConcurrentDictionary<string, byte[]> imageCollector);
    }

    public class ExportCastLibraryQueryHandler(
        ICastReadRepository castReadRepository,
        IImageFileNameQueryHandler imageFileNameQueryHandler,
        IImageKeyCreator imageKeyCreator,
        ICastCardFactory castCardFactory) : IExportCastLibraryQueryHandler
    {
        private readonly string _entityName = "cast";

        public async Task<List<CastCard>> HandleAsync(ExportLibraryQuery query, ConcurrentDictionary<string, byte[]> imageCollector)
        {
            var casts = await castReadRepository.GetAllByDmAsync(query.DmUserId);

            var castCardCollection = new ConcurrentBag<CastCard>();
            
            await Parallel.ForEachAsync(casts, new ParallelOptions { MaxDegreeOfParallelism = 4 }, async (cast, cancellationToken) =>
            {
                var imageKey = imageKeyCreator.Create(query.DmUserId, Guid.Empty, cast.Id, EntityType.Cast);

                var imageFileName = await imageFileNameQueryHandler.HandleAsync(
                    imageKey, _entityName, cast.Name, query.UsedFileNames, imageCollector);

                var card = castCardFactory.Create(cast, imageFileName);

                castCardCollection.Add(card);
            });

            return castCardCollection.ToList();
        }
    }
}
