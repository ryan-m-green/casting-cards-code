using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Queries.Faction;

public interface IGetFactionDetailQueryHandler
{
    Task<FactionDomain?> HandleAsync(Guid factionId);
}

public class GetFactionDetailQueryHandler(
    IFactionReadRepository factionReadRepository,
    IImageKeyCreator imageKeyCreator,
    IImageStorageOperator imageStorageOperator) : IGetFactionDetailQueryHandler
{
    public async Task<FactionDomain?> HandleAsync(Guid factionId)
    {
        var faction = await factionReadRepository.GetByIdAsync(factionId);
        if (faction is null) return null;

        var imageKey = imageKeyCreator.Create(faction.DmUserId, faction.FactionId, EntityType.Faction);
        faction.ImageUrl = imageStorageOperator.GetPublicUrl(imageKey);

        return faction;
    }
}
