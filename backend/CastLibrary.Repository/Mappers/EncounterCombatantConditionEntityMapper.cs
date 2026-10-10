using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface IEncounterCombatantConditionEntityMapper
{
    EncounterCombatantConditionDomain ToDomain(EncounterCombatantConditionEntity entity);
}

public class EncounterCombatantConditionEntityMapper : IEncounterCombatantConditionEntityMapper
{
    public EncounterCombatantConditionDomain ToDomain(EncounterCombatantConditionEntity entity) => new()
    {
        Id = entity.Id,
        CombatantId = entity.CombatantId,
        ConditionName = entity.ConditionName,
        AssignedAt = entity.AssignedAt,
    };
}
