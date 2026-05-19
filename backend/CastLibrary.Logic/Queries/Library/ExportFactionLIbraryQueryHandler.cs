using CastLibrary.Logic.Factories;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;
using System.Collections.Concurrent;

namespace CastLibrary.Logic.Queries.Library
{
    public interface IExportFactionLibraryQueryHandler
    {
        Task<List<FactionCard>> HandleAsync(ExportLibraryQuery query);
    }
    public class ExportFactionLibraryQueryHandler(
         IFactionReadRepository factionReadRepository,
        IFactionCardFactory factionCardFactory
        ) : IExportFactionLibraryQueryHandler
    {
        public async Task<List<FactionCard>> HandleAsync(ExportLibraryQuery query)
        {
            var factions = await factionReadRepository.GetAllByDmAsync(query.DmUserId);

            var factionCards = new ConcurrentBag<FactionCard>();

            await Parallel.ForEachAsync(factions, async (faction, cancellationToken) =>
             {
                 var factionCard = factionCardFactory.Create(faction);

                 factionCards.Add(factionCard);
             });

            return factionCards.ToList();
        }
    }
}
