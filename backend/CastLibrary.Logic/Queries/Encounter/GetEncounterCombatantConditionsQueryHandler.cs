using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Queries.Encounter;

public interface IGetEncounterCombatantConditionsQueryHandler
{
    /// <summary>
    /// The conditions the given card of the encounter carries, lowest first. Null when
    /// the card is not one of that encounter's own rows.
    /// </summary>
    Task<List<EncounterCombatantConditionDomain>> HandleAsync(Guid encounterId, Guid combatantId);
}

public class GetEncounterCombatantConditionsQueryHandler(
    IEncounterReadRepository readRepository,
    IEncounterCombatantConditionReadRepository conditionReadRepository)
    : IGetEncounterCombatantConditionsQueryHandler
{
    public async Task<List<EncounterCombatantConditionDomain>> HandleAsync(Guid encounterId, Guid combatantId)
    {
        var combatant = await readRepository.GetCombatantByIdAsync(combatantId);
        if (combatant is null || combatant.EncounterId != encounterId) return null;

        return await conditionReadRepository.GetByCombatantAsync(combatantId);
    }
}
