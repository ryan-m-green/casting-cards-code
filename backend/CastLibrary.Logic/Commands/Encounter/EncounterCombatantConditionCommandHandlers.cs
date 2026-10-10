using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Encounter;

// ── Assign a condition to a card of the encounter ───────────────────────────────
// A cast card is the encounter's own row, so the DM's conditions are kept against
// that row (a party member's keep to their player card, see AssignConditionCommand).

public interface IAssignEncounterCombatantConditionCommandHandler
{
    Task<EncounterCombatantConditionDomain> HandleAsync(AssignEncounterCombatantConditionCommand command);
}

public class AssignEncounterCombatantConditionCommandHandler(
    IEncounterReadRepository readRepository,
    IEncounterCombatantConditionInsertRepository conditionInsertRepository)
    : IAssignEncounterCombatantConditionCommandHandler
{
    public async Task<EncounterCombatantConditionDomain> HandleAsync(AssignEncounterCombatantConditionCommand command)
    {
        var name = command.Request.ConditionName?.Trim();
        if (string.IsNullOrWhiteSpace(name)) return null;

        if (!await EncounterConditions.CardBelongsToAsync(readRepository, command.EncounterId, command.CombatantId))
            return null;

        var condition = new EncounterCombatantConditionDomain
        {
            Id = Guid.NewGuid(),
            CombatantId = command.CombatantId,
            ConditionName = name,
            AssignedAt = DateTime.UtcNow,
        };
        return await conditionInsertRepository.InsertAsync(condition);
    }
}

public class AssignEncounterCombatantConditionCommand
{
    public AssignEncounterCombatantConditionCommand(Guid encounterId, Guid combatantId, AssignConditionRequest request)
    {
        EncounterId = encounterId;
        CombatantId = combatantId;
        Request = request;
    }

    public Guid EncounterId { get; }
    public Guid CombatantId { get; }
    public AssignConditionRequest Request { get; }
}

// ── Take a condition off a card of the encounter ────────────────────────────────

public interface IRemoveEncounterCombatantConditionCommandHandler
{
    Task<bool> HandleAsync(RemoveEncounterCombatantConditionCommand command);
}

public class RemoveEncounterCombatantConditionCommandHandler(
    IEncounterReadRepository readRepository,
    IEncounterCombatantConditionReadRepository conditionReadRepository,
    IEncounterCombatantConditionDeleteRepository conditionDeleteRepository)
    : IRemoveEncounterCombatantConditionCommandHandler
{
    public async Task<bool> HandleAsync(RemoveEncounterCombatantConditionCommand command)
    {
        if (!await EncounterConditions.CardBelongsToAsync(readRepository, command.EncounterId, command.CombatantId))
            return false;

        var conditions = await conditionReadRepository.GetByCombatantAsync(command.CombatantId);
        if (conditions.All(condition => condition.Id != command.ConditionId)) return false;

        await conditionDeleteRepository.DeleteAsync(command.ConditionId);
        return true;
    }
}

public class RemoveEncounterCombatantConditionCommand
{
    public RemoveEncounterCombatantConditionCommand(Guid encounterId, Guid combatantId, Guid conditionId)
    {
        EncounterId = encounterId;
        CombatantId = combatantId;
        ConditionId = conditionId;
    }

    public Guid EncounterId { get; }
    public Guid CombatantId { get; }
    public Guid ConditionId { get; }
}

/// <summary>
/// The one check both condition commands make: the card is one of this encounter's
/// own rows, so a request naming another fight's card changes nothing.
/// </summary>
internal static class EncounterConditions
{
    public static async Task<bool> CardBelongsToAsync(
        IEncounterReadRepository readRepository, Guid encounterId, Guid combatantId)
    {
        var combatant = await readRepository.GetCombatantByIdAsync(combatantId);
        return combatant is not null && combatant.EncounterId == encounterId;
    }
}
