using System.Text.RegularExpressions;
using CastLibrary.Logic.Commands.CampaignChronicles;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Delete;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Encounter;

// ── Create Encounter ────────────────────────────────────────────────────────────

public interface ICreateEncounterCommandHandler
{
    Task<CampaignEncounterDomain> HandleAsync(CreateEncounterCommand command);
}

public class CreateEncounterCommandHandler(
    IEncounterReadRepository readRepository,
    IEncounterInsertRepository insertRepository,
    IPlayerCardReadRepository playerCardRepository,
    IEncounterCombatantBuilder combatantBuilder) : ICreateEncounterCommandHandler
{
    public async Task<CampaignEncounterDomain> HandleAsync(CreateEncounterCommand command)
    {
        var existing = await readRepository.GetEncountersByCampaignAsync(command.CampaignId);
        var nextSequence = existing.Count == 0 ? 1 : existing.Max(e => e.SequenceNumber) + 1;

        // A new encounter is "planned": it is saved and editable straight away, but
        // it is not the campaign's running encounter until its initiative is
        // started from the circle (see StartEncounterCommandHandler). Creating one
        // therefore leaves any fight that is running alone.
        var encounter = new CampaignEncounterDomain
        {
            Id = Guid.NewGuid(),
            CampaignId = command.CampaignId,
            SequenceNumber = nextSequence,
            Name = string.IsNullOrWhiteSpace(command.Request.Name)
                ? $"Encounter {nextSequence}"
                : command.Request.Name!.Trim(),
            Status = "planned",
        };

        await insertRepository.InsertEncounterAsync(encounter);

        // The party is always part of the encounter, so one spot per player card
        // is created here. A spot holding a single card is named after that card.
        // Their initiative numbers are collected with everyone else's later (one
        // value per spot) and that commit is what sets their turn order.
        //
        // These spots are the first places of the ring's budget: the count starts
        // at the party, and the DM's groups take what is left of it (see
        // EncounterRules.MaxSpots).
        var order = 0;
        foreach (var card in await playerCardRepository.GetByCampaignAsync(command.CampaignId))
        {
            var combatant = await combatantBuilder.FromPlayerCardAsync(encounter.Id, card.Id);
            if (combatant is null) continue;

            var spot = new EncounterSpotDomain
            {
                Id = Guid.NewGuid(),
                EncounterId = encounter.Id,
                InitiativeOrder = order++,
                GroupName = card.Name,
            };
            await insertRepository.InsertSpotAsync(spot);

            combatant.SpotId = spot.Id;
            await insertRepository.InsertCombatantAsync(combatant);

            spot.Combatants = [combatant];
            encounter.Spots.Add(spot);
        }

        return encounter;
    }
}

public class CreateEncounterCommand
{
    public CreateEncounterCommand(Guid campaignId, CreateEncounterRequest request)
    {
        CampaignId = campaignId;
        Request = request;
    }
    public Guid CampaignId { get; }
    public CreateEncounterRequest Request { get; }
}

// ── Add Combatant ───────────────────────────────────────────────────────────────

public interface IAddCombatantToEncounterCommandHandler
{
    Task<EncounterCombatantDomain> HandleAsync(AddCombatantToEncounterCommand command);
}

public class AddCombatantToEncounterCommandHandler(
    IEncounterReadRepository readRepository,
    IEncounterInsertRepository insertRepository,
    IEncounterUpdateRepository updateRepository,
    IEncounterCombatantBuilder combatantBuilder) : IAddCombatantToEncounterCommandHandler
{
    public async Task<EncounterCombatantDomain> HandleAsync(AddCombatantToEncounterCommand command)
    {
        var encounter = await readRepository.GetEncounterByIdAsync(command.EncounterId);
        if (encounter is null) return null;

        var request = command.Request;
        var combatant = await combatantBuilder.FromRequestAsync(
            encounter.Id,
            request.CombatantType,
            request.SourceCastId,
            request.PlayerCardId,
            request.OriginCampaignCastInstanceId);
        if (combatant is null) return null;

        // Resolve the target spot: reuse an existing one or create a new single spot.
        Guid spotId;
        EncounterSpotDomain target = null;
        if (request.SpotId is Guid requestedSpot && encounter.Spots.Any(s => s.Id == requestedSpot))
        {
            spotId = requestedSpot;
            target = encounter.Spots.First(s => s.Id == requestedSpot);
        }
        else
        {
            // A card of its own needs a place of its own, and the ring holds a fixed
            // number of them (see EncounterRules): joining an existing group is the
            // only thing left to do once it is full.
            if (encounter.Spots.Count >= EncounterRules.MaxSpots) return null;

            var nextOrder = encounter.Spots.Count == 0 ? 0 : encounter.Spots.Max(s => s.InitiativeOrder) + 1;
            var spot = new EncounterSpotDomain
            {
                Id = Guid.NewGuid(),
                EncounterId = encounter.Id,
                InitiativeOrder = nextOrder,
                GroupName = null,
            };
            await insertRepository.InsertSpotAsync(spot);
            spotId = spot.Id;
        }

        combatant.SpotId = spotId;
        await insertRepository.InsertCombatantAsync(combatant);

        // A spot holding one card is named after that card (see CreateEncounterSpotCommandHandler).
        // The moment a second card joins it, it is a group and takes a group's own name, so the
        // group has a name of its own to show - and to rename - rather than a copy of the card's.
        if (target is not null && IsNamedAfterItsOnlyCard(target))
        {
            var groupName = CreateEncounterSpotCommandHandler.NextGroupName(encounter.Spots);
            await updateRepository.UpdateSpotGroupNameAsync(target.Id, groupName);
            target.GroupName = groupName;
        }

        return combatant;
    }

    /// <summary>
    /// Whether a spot's name is nothing but the name of the one card it holds, rather than
    /// something chosen for it: only such a name may be replaced by a group's own. Read before
    /// the arriving card is counted - the spot as it stands is the one the card just joined.
    /// </summary>
    private static bool IsNamedAfterItsOnlyCard(EncounterSpotDomain spot)
    {
        if (spot.Combatants.Count != 1) return false;
        if (string.IsNullOrWhiteSpace(spot.GroupName)) return true;

        return string.Equals(spot.GroupName, spot.Combatants[0].DisplayName, StringComparison.Ordinal);
    }
}

public class AddCombatantToEncounterCommand
{
    public AddCombatantToEncounterCommand(Guid encounterId, AddCombatantRequest request)
    {
        EncounterId = encounterId;
        Request = request;
    }
    public Guid EncounterId { get; }
    public AddCombatantRequest Request { get; }
}

// ── Create Group ────────────────────────────────────────────────────────────────

public interface ICreateEncounterGroupCommandHandler
{
    Task<EncounterSpotDomain> HandleAsync(CreateEncounterGroupCommand command);
}

public class CreateEncounterGroupCommandHandler(
    IEncounterReadRepository readRepository,
    IEncounterInsertRepository insertRepository,
    IEncounterUpdateRepository updateRepository) : ICreateEncounterGroupCommandHandler
{
    public async Task<EncounterSpotDomain> HandleAsync(CreateEncounterGroupCommand command)
    {
        var encounter = await readRepository.GetEncounterByIdAsync(command.EncounterId);
        if (encounter is null) return null;

        // A new group is a new place on the ring, and the ring holds a fixed number
        // of them, the party's places among them (see EncounterRules).
        if (encounter.Spots.Count >= EncounterRules.MaxSpots) return null;

        var nextOrder = encounter.Spots.Count == 0 ? 0 : encounter.Spots.Max(s => s.InitiativeOrder) + 1;
        var spot = new EncounterSpotDomain
        {
            Id = Guid.NewGuid(),
            EncounterId = encounter.Id,
            InitiativeOrder = nextOrder,
            GroupName = string.IsNullOrWhiteSpace(command.Request.GroupName) ? "Group" : command.Request.GroupName.Trim(),
        };
        await insertRepository.InsertSpotAsync(spot);
        foreach (var combatantId in command.Request.CombatantIds)
        {
            await updateRepository.MoveCombatantToSpotAsync(combatantId, spot.Id);
        }

        return spot;
    }
}

public class CreateEncounterGroupCommand
{
    public CreateEncounterGroupCommand(Guid encounterId, CreateGroupRequest request)
    {
        EncounterId = encounterId;
        Request = request;
    }
    public Guid EncounterId { get; }
    public CreateGroupRequest Request { get; }
}

// ── Update Combatant (HP / defeated) ────────────────────────────────────────────

public interface IUpdateEncounterCombatantCommandHandler
{
    Task<EncounterCombatantDomain> HandleAsync(UpdateEncounterCombatantCommand command);
}

/// <summary>
/// Writes a combatant's hit points and its down state. A cast card that goes down also
/// sheds the conditions it was carrying — they are for a card still in the fight — and
/// the party is awarded its trophy for the card the first time it falls.
/// </summary>
public class UpdateEncounterCombatantCommandHandler(
    IEncounterReadRepository readRepository,
    IEncounterUpdateRepository updateRepository,
    IEncounterInsertRepository insertRepository,
    IEncounterCombatantConditionDeleteRepository conditionDeleteRepository) : IUpdateEncounterCombatantCommandHandler
{
    public async Task<EncounterCombatantDomain> HandleAsync(UpdateEncounterCombatantCommand command)
    {
        var combatant = await readRepository.GetCombatantByIdAsync(command.CombatantId);
        if (combatant is null || combatant.EncounterId != command.EncounterId) return null;

        var request = command.Request;
        if (request.MaxHitPoints is int max) combatant.MaxHitPoints = max;
        if (request.LostHitPoints is int lost) combatant.LostHitPoints = lost;
        if (request.TempHitPoints is int temp) combatant.TempHitPoints = temp;

        var wasDefeated = combatant.IsDefeated;
        if (request.IsDefeated is bool defeated) combatant.IsDefeated = defeated;
        if (request.IsCaptured is bool captured) combatant.IsCaptured = captured;
        if (request.IsEscaped is bool escaped) combatant.IsEscaped = escaped;
        if (request.Notes is string notes) combatant.Notes = notes;
        ResolveCombatantState(combatant, request);

        await updateRepository.UpdateCombatantAsync(combatant);

        // What the card was carrying comes off it as it goes down. Only on the fall
        // itself, so a condition the DM puts on a card that is already down is left
        // where they put it.
        if (!wasDefeated && combatant.IsDefeated && combatant.CombatantType == "cast")
        {
            await conditionDeleteRepository.DeleteByCombatantAsync(combatant.Id);
        }

        // Award a party trophy the first time a cast combatant is marked defeated, so the trophies read
        // right while the fight is still running. What is captured is every fall of the encounter that
        // has not been counted yet — this one, and any that never reached the table — and each row is
        // stamped as it is counted, so the end of the fight can sweep up what is left without counting
        // anything twice (see EndEncounterCommandHandler).
        if (!wasDefeated && combatant.IsDefeated && combatant.CombatantType == "cast")
        {
            var encounter = await readRepository.GetEncounterByIdAsync(combatant.EncounterId);
            if (encounter is not null)
            {
                await insertRepository.CaptureEncounterTrophiesAsync(encounter.CampaignId, encounter.Id);
            }
        }

        return combatant;
    }

    private static void ResolveCombatantState(EncounterCombatantDomain combatant, UpdateCombatantRequest request)
    {
        var down = combatant.IsDefeated
            || (combatant.MaxHitPoints > 0 && combatant.LostHitPoints >= combatant.MaxHitPoints);

        if (down)
        {
            combatant.IsDefeated = true;
            combatant.IsCaptured = false;
            combatant.IsEscaped = false;
            return;
        }

        if (request.IsEscaped is true || (request.IsCaptured is null && combatant.IsEscaped))
        {
            combatant.IsCaptured = false;
            return;
        }

        if (request.IsCaptured is true || combatant.IsCaptured)
        {
            combatant.IsEscaped = false;
        }
    }
}

public class UpdateEncounterCombatantCommand
{
    public UpdateEncounterCombatantCommand(Guid encounterId, Guid combatantId, UpdateCombatantRequest request)
    {
        EncounterId = encounterId;
        CombatantId = combatantId;
        Request = request;
    }
    public Guid EncounterId { get; }
    public Guid CombatantId { get; }
    public UpdateCombatantRequest Request { get; }
}

// ── Remove Combatant ────────────────────────────────────────────────────────────

public interface IRemoveEncounterCombatantCommandHandler
{
    Task HandleAsync(RemoveEncounterCombatantCommand command);
}

public class RemoveEncounterCombatantCommandHandler(IEncounterDeleteRepository deleteRepository) : IRemoveEncounterCombatantCommandHandler
{
    public Task HandleAsync(RemoveEncounterCombatantCommand command) =>
        deleteRepository.DeleteCombatantAsync(command.CombatantId);
}

public class RemoveEncounterCombatantCommand
{
    public RemoveEncounterCombatantCommand(Guid combatantId) => CombatantId = combatantId;
    public Guid CombatantId { get; }
}

// ── Reorder Spots ───────────────────────────────────────────────────────────────

public interface IReorderEncounterSpotsCommandHandler
{
    Task HandleAsync(ReorderEncounterSpotsCommand command);
}

/// <summary>
/// Writes the ring's initiative order: the spots then run clockwise from the top in
/// exactly the order the ids arrive. A request must name the encounter's whole ring
/// (anything less would leave spots sharing a place), and the turn marker is put back
/// on the place it was on: the turn belongs to the place, not to the group that
/// happens to be standing on it, so reordering never moves the turn.
/// </summary>
public class ReorderEncounterSpotsCommandHandler(
    IEncounterReadRepository readRepository,
    IEncounterUpdateRepository updateRepository) : IReorderEncounterSpotsCommandHandler
{
    public async Task HandleAsync(ReorderEncounterSpotsCommand command)
    {
        var encounter = await readRepository.GetEncounterByIdAsync(command.EncounterId);
        if (encounter is null) return;

        var current = encounter.Spots.OrderBy(spot => spot.InitiativeOrder).ToList();
        var order = command.Request.SpotIds;

        if (order.Count != current.Count || !order.ToHashSet().SetEquals(current.Select(spot => spot.Id))) return;

        // The place the turn is on, read off the ring as it stands before the move.
        var markerPlace = encounter.CurrentSpotId is Guid marked
            ? current.FindIndex(spot => spot.Id == marked)
            : -1;

        for (var place = 0; place < order.Count; place++)
        {
            await updateRepository.UpdateSpotOrderAsync(order[place], place);
        }

        // Put the turn back on the same place, on whichever group now holds it.
        if (markerPlace >= 0)
        {
            await updateRepository.SetCurrentSpotAsync(encounter.Id, order[markerPlace]);
        }
    }
}

public class ReorderEncounterSpotsCommand
{
    public ReorderEncounterSpotsCommand(Guid encounterId, ReorderSpotsRequest request)
    {
        EncounterId = encounterId;
        Request = request;
    }
    public Guid EncounterId { get; }
    public ReorderSpotsRequest Request { get; }
}

// ── Advance Turn ────────────────────────────────────────────────────────────────

public interface IAdvanceEncounterTurnCommandHandler
{
    Task<EncounterTurnDomain> HandleAsync(AdvanceEncounterTurnCommand command);
}

public class AdvanceEncounterTurnCommandHandler(
    IEncounterReadRepository readRepository,
    IEncounterUpdateRepository updateRepository,
    IEndEncounterCommandHandler endEncounterCommand) : IAdvanceEncounterTurnCommandHandler
{
    public async Task<EncounterTurnDomain> HandleAsync(AdvanceEncounterTurnCommand command)
    {
        var encounter = await readRepository.GetEncounterByIdAsync(command.EncounterId);
        if (encounter is null || encounter.Spots.Count == 0) return null;

        var foes = encounter.Spots
            .SelectMany(spot => spot.Combatants)
            .Where(combatant => !string.Equals(combatant.CombatantType, "player", StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (foes.Count > 0 && !foes.Any(CanStillAct))
        {
            await endEncounterCommand.HandleAsync(new EndEncounterCommand(encounter.Id, true));

            return new EncounterTurnDomain
            {
                CurrentSpotId = null,
                RoundNumber = 0,
                Ended = true,
            };
        }

        var spots = encounter.Spots.OrderBy(s => s.InitiativeOrder).ToList();
        var currentIndex = encounter.CurrentSpotId is Guid current
            ? spots.FindIndex(s => s.Id == current)
            : -1;

        var isPrev = string.Equals(command.Request.Direction, "prev", StringComparison.OrdinalIgnoreCase);
        var round = encounter.RoundNumber > 0 ? encounter.RoundNumber : 1;
        var nextIndex = NextLiveIndex(spots, currentIndex, isPrev, out var wrapped);

        if (wrapped)
        {
            round = isPrev ? Math.Max(round - 1, 1) : round + 1;
        }

        var nextSpotId = spots[nextIndex].Id;
        await updateRepository.SetCurrentSpotAsync(encounter.Id, nextSpotId);
        await updateRepository.IncrementSpotTurnsTakenAsync(nextSpotId);

        if (round != encounter.RoundNumber)
        {
            await updateRepository.SetEncounterRoundAsync(encounter.Id, round);
        }

        return new EncounterTurnDomain
        {
            CurrentSpotId = nextSpotId,
            RoundNumber = round,
        };
    }

    private static int NextLiveIndex(
        IReadOnlyList<EncounterSpotDomain> spots, int currentIndex, bool isPrev, out bool wrapped)
    {
        if (currentIndex < 0)
        {
            wrapped = false;

            for (var index = 0; index < spots.Count; index++)
            {
                if (IsLive(spots[index])) return index;
            }

            return 0;
        }

        for (var taken = 1; taken <= spots.Count; taken++)
        {
            var index = isPrev
                ? ((currentIndex - taken) % spots.Count + spots.Count) % spots.Count
                : (currentIndex + taken) % spots.Count;

            if (!IsLive(spots[index])) continue;

            wrapped = isPrev ? index >= currentIndex : index <= currentIndex;
            return index;
        }

        wrapped = false;
        return currentIndex;
    }

    private static bool IsLive(EncounterSpotDomain spot) =>
        spot.Combatants.Any(CanStillAct);

    private static bool CanStillAct(EncounterCombatantDomain combatant) =>
        string.Equals(combatant.CombatantType, "player", StringComparison.OrdinalIgnoreCase)
        || (!combatant.IsDefeated && !combatant.IsCaptured && !combatant.IsEscaped);
}

public class AdvanceEncounterTurnCommand
{
    public AdvanceEncounterTurnCommand(Guid encounterId, AdvanceTurnRequest request)
    {
        EncounterId = encounterId;
        Request = request;
    }
    public Guid EncounterId { get; }
    public AdvanceTurnRequest Request { get; }
}

// ── Start Encounter (the fight is running) ──────────────────────────────────────

public interface IStartEncounterCommandHandler
{
    Task<CampaignEncounterDomain> HandleAsync(StartEncounterCommand command);
}

/// <summary>
/// Starts the encounter's initiative: it takes the 'ordering' state, where the numbers rolled for
/// it are turned in. Committing those numbers is what makes it the campaign's active encounter (see
/// SetEncounterInitiativeCommandHandler), so a fight already running is left alone until then
/// rather than being cut off while the new order is still being dialled in. An encounter that was
/// ended can be started again (its ended stamp is cleared).
/// </summary>
public class StartEncounterCommandHandler(
    IEncounterReadRepository readRepository,
    IEncounterUpdateRepository updateRepository) : IStartEncounterCommandHandler
{
    public async Task<CampaignEncounterDomain> HandleAsync(StartEncounterCommand command)
    {
        var encounter = await readRepository.GetEncounterByIdAsync(command.EncounterId);
        if (encounter is null) return null;

        if (!string.Equals(encounter.Status, "ordering", StringComparison.OrdinalIgnoreCase))
        {
            encounter.Status = "ordering";
            encounter.EndedAt = null;
            await updateRepository.UpdateEncounterAsync(encounter);
        }

        return encounter;
    }
}

public class StartEncounterCommand
{
    public StartEncounterCommand(Guid encounterId) => EncounterId = encounterId;
    public Guid EncounterId { get; }
}

// ── End Encounter ───────────────────────────────────────────────────────────────

public interface IEndEncounterCommandHandler
{
    Task HandleAsync(EndEncounterCommand command);
}

/// <summary>
/// Ends the fight: the cast cards that were put down are counted into the campaign's trophies — one
/// tally per distinct card — and the encounter goes back to where a fight starts, its places to order
/// 0 and the rolled numbers off the combatant rows, so the next ordering step begins from nothing.
/// The conditions the fight left on its cards are cleared with it: every one a party member's card was
/// carrying, and every one on a cast card that finished the fight down, taken or fled.
/// </summary>
public class EndEncounterCommandHandler(
    IEncounterReadRepository readRepository,
    IEncounterUpdateRepository updateRepository,
    IEncounterInsertRepository insertRepository,
    IAddChronicleCommandHandler addChronicleCommand,
    ICastReadRepository castRepository) : IEndEncounterCommandHandler
{
    public async Task HandleAsync(EndEncounterCommand command)
    {
        var encounter = await readRepository.GetEncounterByIdAsync(command.EncounterId);
        if (encounter is null) return;

        var rounds = encounter.RoundNumber;

        encounter.Status = "ended";
        encounter.EndedAt = DateTime.UtcNow;

        // No turn marker either: the fight is over, so the encounter holds no current spot until the
        // next Finalize order takes up the first turn.
        encounter.CurrentSpotId = null;
        encounter.RoundNumber = 0;
        await updateRepository.UpdateEncounterAsync(encounter);

        // The fight's dead, taken down as it ends: every cast card still lying down that has not been
        // counted yet goes into the campaign's trophies, one tally per distinct card, so the table
        // holds what the fight put down however the DM left the cards. A fight whose falls were counted
        // as they happened was written by them (see UpdateEncounterCombatantCommandHandler), and ending
        // the encounter again counts nothing: what has been counted is stamped, and only the unstamped
        // is counted.
        await insertRepository.CaptureEncounterTrophiesAsync(encounter.CampaignId, encounter.Id);

        // Every place back to 0 and every roll cleared: the encounter's next fight sets both again from
        // scratch, and a read in the meantime falls back to the order the spots were created in.
        await updateRepository.ResetSpotOrdersAsync(encounter.Id);
        await updateRepository.ResetSpotTurnsAsync(encounter.Id);
        await updateRepository.ClearSpotInitiativeNumbersAsync(encounter.Id);

        // Nothing a card was carrying outlives the fight: every condition comes off the party's own
        // cards, and off a cast card that finished the fight down, taken or fled. A cast card still
        // standing keeps what it carries.
        await updateRepository.ClearEncounterConditionsAsync(encounter.Id);

        if (command.RecordChronicle)
        {
            var chronicle = await BuildEncounterChronicleAsync(encounter, rounds, castRepository);
            await addChronicleCommand.HandleAsync(new AddChronicleCommand(encounter.CampaignId, chronicle));
        }
    }

    /// <summary>
    /// The fight as a chronicle entry: the number of rounds it ran for, and every distinct cast card
    /// that stood in it, one participant per card. The card's identity, its face (role, race and
    /// portrait), how many copies of it the fight held and how it finished are carried on the
    /// participant itself, so the entry draws the fight's simple cast cards from its own link rather
    /// than spelling them out in the body.
    /// </summary>
    private static async Task<CreateChronicleRequest> BuildEncounterChronicleAsync(
        CampaignEncounterDomain encounter, int rounds, ICastReadRepository castRepository)
    {
        var castCards = encounter.Spots
            .SelectMany(spot => spot.Combatants)
            .Where(combatant => !string.Equals(combatant.CombatantType, "player", StringComparison.OrdinalIgnoreCase))
            .ToList();

        // One participant per distinct card, in the order the fight's rows came in, so the entry keeps
        // the encounter's own sequence. A group of identical cards is one participant whose count says
        // how many copies of it stood in the fight.
        var distinct = castCards
            .GroupBy(CardKeyOf)
            .Select(group => new
            {
                Card = group.First(),
                Count = group.Count(),
                State = EndedStateOf(group),
            })
            .ToList();

        var participants = new List<ChronicleParticipant>();

        foreach (var entry in distinct)
        {
            // Role and race are not on the encounter's row, so they are read from the library cast the
            // card came from. A cast that has since been deleted leaves just the name and portrait.
            var cast = entry.Card.SourceCastId is Guid castId
                ? await castRepository.GetByIdAsync(castId)
                : null;

            participants.Add(new ChronicleParticipant
            {
                EntityType = "cast",
                EntityId = entry.Card.SourceCastId?.ToString() ?? CardKeyOf(entry.Card),
                EntityName = entry.Card.DisplayName,
                EntityRole = cast?.Role ?? string.Empty,
                EntityRace = cast?.Race ?? string.Empty,
                EntityImageUrl = entry.Card.ImageUrl,
                EntityState = entry.State,
                EntityCount = entry.Count,
            });
        }

        return new CreateChronicleRequest
        {
            ContentType = ChronicleContentType.Encounter,
            SourceId = encounter.Id,
            Title = encounter.Name,
            Body = rounds + " " + Plural(rounds, "round"),
            IsGmOnly = false,
            Participants = participants,
        };
    }

    private static string CardKeyOf(EncounterCombatantDomain combatant) =>
        combatant.OriginCampaignCastInstanceId is Guid instanceId
            ? $"instance:{instanceId}"
            : $"cast:{combatant.SourceCastId}";

    /// <summary>
    /// How a distinct card finished the fight. The states are exclusive on a single card, so a card
    /// that stood in the fight once simply reads its own end; a card holding several copies reads the
    /// most decisive one they reached — a fall before a capture, a capture before a flight.
    /// </summary>
    private static string EndedStateOf(IEnumerable<EncounterCombatantDomain> copies)
    {
        var card = copies.ToList();

        if (card.Any(copy => copy.IsDefeated)) return "defeated";
        if (card.Any(copy => copy.IsCaptured)) return "captured";
        if (card.Any(copy => copy.IsEscaped)) return "escaped";

        return string.Empty;
    }

    private static string Plural(int count, string word) =>
        count == 1 ? word : word + "s";
}

public class EndEncounterCommand
{
    public EndEncounterCommand(Guid encounterId, bool recordChronicle = false)
    {
        EncounterId = encounterId;
        RecordChronicle = recordChronicle;
    }
    public Guid EncounterId { get; }
    public bool RecordChronicle { get; }
}

// ── Create Spot (a whole encounter group in one call) ───────────────────────────

public interface ICreateEncounterSpotCommandHandler
{
    Task<EncounterSpotDomain> HandleAsync(CreateEncounterSpotCommand command);
}

/// <summary>
/// Creates an encounter spot together with every card in it, in one call.
///
/// Naming rule (hard coded, incremental):
///   • a spot holding a single card is named after that card
///   • a spot holding several cards is named "group 1", "group 2", … using the
///     next free number, so names stay stable when spots are added or removed
/// A name can always be changed afterwards through the rename endpoint.
/// </summary>
public class CreateEncounterSpotCommandHandler(
    IEncounterReadRepository readRepository,
    IEncounterInsertRepository insertRepository,
    IEncounterCombatantBuilder combatantBuilder) : ICreateEncounterSpotCommandHandler
{
    public async Task<EncounterSpotDomain> HandleAsync(CreateEncounterSpotCommand command)
    {
        var encounter = await readRepository.GetEncounterByIdAsync(command.EncounterId);
        if (encounter is null) return null;

        var requested = command.Request.Combatants;
        if (requested.Count == 0) return null;

        // The whole group goes into one new place, and the ring holds a fixed number
        // of places, the party's among them (see EncounterRules).
        if (encounter.Spots.Count >= EncounterRules.MaxSpots) return null;

        // Resolve everything first: nothing is written unless every card resolves.
        var combatants = new List<EncounterCombatantDomain>();
        foreach (var item in requested)
        {
            var combatant = await combatantBuilder.FromRequestAsync(
                encounter.Id,
                item.CombatantType,
                item.SourceCastId,
                item.PlayerCardId,
                item.OriginCampaignCastInstanceId);
            if (combatant is null) return null;
            combatants.Add(combatant);
        }

        var spot = new EncounterSpotDomain
        {
            Id = Guid.NewGuid(),
            EncounterId = encounter.Id,
            InitiativeOrder = encounter.Spots.Count == 0 ? 0 : encounter.Spots.Max(s => s.InitiativeOrder) + 1,
            GroupName = combatants.Count == 1 ? combatants[0].DisplayName : NextGroupName(encounter.Spots),
        };
        await insertRepository.InsertSpotAsync(spot);

        foreach (var combatant in combatants)
        {
            combatant.SpotId = spot.Id;
            await insertRepository.InsertCombatantAsync(combatant);
        }

        spot.Combatants = combatants;
        return spot;
    }

    /// <summary>
    /// "group N", where N is the next unused number for this encounter. Shared rather than
    /// private: the add path names a spot the same way when a second card turns it into a group.
    /// </summary>
    internal static string NextGroupName(IEnumerable<EncounterSpotDomain> spots)
    {
        var highest = 0;
        foreach (var spot in spots)
        {
            var match = Regex.Match(spot.GroupName ?? string.Empty, @"^group\s+(\d+)$", RegexOptions.IgnoreCase);
            if (match.Success && int.TryParse(match.Groups[1].Value, out var number) && number > highest)
            {
                highest = number;
            }
        }
        return $"group {highest + 1}";
    }
}

public class CreateEncounterSpotCommand
{
    public CreateEncounterSpotCommand(Guid encounterId, CreateEncounterSpotRequest request)
    {
        EncounterId = encounterId;
        Request = request;
    }
    public Guid EncounterId { get; }
    public CreateEncounterSpotRequest Request { get; }
}

// ── Rename Spot ─────────────────────────────────────────────────────────────────

public interface IRenameEncounterSpotCommandHandler
{
    Task<bool> HandleAsync(RenameEncounterSpotCommand command);
}

public class RenameEncounterSpotCommandHandler(
    IEncounterReadRepository readRepository,
    IEncounterUpdateRepository updateRepository) : IRenameEncounterSpotCommandHandler
{
    public async Task<bool> HandleAsync(RenameEncounterSpotCommand command)
    {
        var encounter = await readRepository.GetEncounterByIdAsync(command.EncounterId);
        if (encounter is null || encounter.Spots.All(s => s.Id != command.SpotId)) return false;

        await updateRepository.UpdateSpotGroupNameAsync(command.SpotId, command.Request.Name.Trim());
        return true;
    }
}

public class RenameEncounterSpotCommand
{
    public RenameEncounterSpotCommand(Guid encounterId, Guid spotId, RenameEncounterSpotRequest request)
    {
        EncounterId = encounterId;
        SpotId = spotId;
        Request = request;
    }
    public Guid EncounterId { get; }
    public Guid SpotId { get; }
    public RenameEncounterSpotRequest Request { get; }
}

// ── Delete Spot ─────────────────────────────────────────────────────────────────

public interface IDeleteEncounterSpotCommandHandler
{
    Task<bool> HandleAsync(DeleteEncounterSpotCommand command);
}

public class DeleteEncounterSpotCommandHandler(
    IEncounterReadRepository readRepository,
    IEncounterDeleteRepository deleteRepository) : IDeleteEncounterSpotCommandHandler
{
    public async Task<bool> HandleAsync(DeleteEncounterSpotCommand command)
    {
        var encounter = await readRepository.GetEncounterByIdAsync(command.EncounterId);
        if (encounter is null || encounter.Spots.All(s => s.Id != command.SpotId)) return false;

        await deleteRepository.DeleteSpotAsync(command.SpotId); // its combatants cascade
        return true;
    }
}

public class DeleteEncounterSpotCommand
{
    public DeleteEncounterSpotCommand(Guid encounterId, Guid spotId)
    {
        EncounterId = encounterId;
        SpotId = spotId;
    }
    public Guid EncounterId { get; }
    public Guid SpotId { get; }
}

// ── Set Initiative (every spot of the encounter, in one call) ───────────────────

public interface ISetEncounterInitiativeCommandHandler
{
    Task<CampaignEncounterDomain> HandleAsync(SetEncounterInitiativeCommand command);
}

/// <summary>
/// Commits the rolled initiative for an encounter, which is also what finalizes its order: the
/// encounter leaves 'ordering' and becomes the campaign's active one, with any other active fight
/// ended, so exactly one is running at a time.
///
/// Each spot's number is duplicated onto every combatant row of that spot (so any row of a group
/// carries its group's initiative), and the spot order is rewritten from the numbers: the highest
/// takes the first place, with each spot's existing order breaking a tie. Spots that were not given
/// a number keep out of the sort and follow the numbered ones in the order they already stand in.
/// </summary>
public class SetEncounterInitiativeCommandHandler(
    IEncounterReadRepository readRepository,
    IEncounterUpdateRepository updateRepository) : ISetEncounterInitiativeCommandHandler
{
    public async Task<CampaignEncounterDomain> HandleAsync(SetEncounterInitiativeCommand command)
    {
        var encounter = await readRepository.GetEncounterByIdAsync(command.EncounterId);
        if (encounter is null) return null;

        var rolled = command.Request.Spots
            .Where(s => s.InitiativeNumber is not null)
            .Where(s => encounter.Spots.Any(spot => spot.Id == s.SpotId))
            .Select(s => (SpotId: s.SpotId, Number: s.InitiativeNumber!.Value))
            .ToList();

        // One statement for the whole commit, then the derived turn order.
        await updateRepository.SetSpotInitiativeNumbersAsync(rolled);

        var numbers = rolled.ToDictionary(n => n.SpotId, n => n.Number);

        // Highest number first: the biggest roll takes place 1, which is the top of the ring and the
        // first turn. A spot with no number stays out of the sort — the numbered ones take the places
        // in order and the rest follow in the order the ring already holds them, which is also what
        // breaks a tie.
        var ordered = encounter.Spots
            .OrderBy(spot => numbers.ContainsKey(spot.Id) ? 0 : 1)
            .ThenByDescending(spot => numbers.TryGetValue(spot.Id, out var number) ? number : 0)
            .ThenBy(spot => spot.InitiativeOrder)
            .ToList();

        for (var index = 0; index < ordered.Count; index++)
        {
            await updateRepository.UpdateSpotOrderAsync(ordered[index].Id, index);
            ordered[index].InitiativeOrder = index;

            if (numbers.TryGetValue(ordered[index].Id, out var number))
            {
                foreach (var combatant in ordered[index].Combatants)
                {
                    combatant.InitiativeNumber = number;
                }
            }
        }

        encounter.Spots = ordered;

        await updateRepository.ResetSpotTurnsAsync(encounter.Id);
        foreach (var spot in ordered) spot.TurnsTaken = 0;

        // The fight starts with its first turn already stood up: the marker goes on the top of the ring
        // (place 1) as the order is committed, so the DM's first Next moves the turn on rather than
        // setting it where the spotlight already points. A fight that never took a turn keeps no
        // marker, which is how a spotless commit lands too.
        encounter.CurrentSpotId = ordered.Count > 0 ? ordered[0].Id : null;
        encounter.RoundNumber = ordered.Count > 0 ? 1 : 0;

        if (encounter.CurrentSpotId is Guid firstSpotId)
        {
            await updateRepository.IncrementSpotTurnsTakenAsync(firstSpotId);
            ordered[0].TurnsTaken = 1;
        }

        // Finalizing the order is what starts the fight: the encounter leaves 'ordering' for
        // 'active', and every other active encounter is ended, so exactly one fight runs at a time.
        encounter.Status = "active";
        encounter.EndedAt = null;
        await updateRepository.UpdateEncounterAsync(encounter);
        await updateRepository.EndOtherActiveEncountersAsync(encounter.CampaignId, encounter.Id);

        return encounter;
    }
}

public class SetEncounterInitiativeCommand
{
    public SetEncounterInitiativeCommand(Guid encounterId, SetEncounterInitiativeRequest request)
    {
        EncounterId = encounterId;
        Request = request;
    }
    public Guid EncounterId { get; }
    public SetEncounterInitiativeRequest Request { get; }
}

// ── Rename Encounter ───────────────────────────────────────────────────────────

public interface IRenameEncounterCommandHandler
{
    Task<bool> HandleAsync(RenameEncounterCommand command);
}

/// <summary>Renames the encounter itself (the title shown on its encounter card).</summary>
public class RenameEncounterCommandHandler(
    IEncounterReadRepository readRepository,
    IEncounterUpdateRepository updateRepository) : IRenameEncounterCommandHandler
{
    public async Task<bool> HandleAsync(RenameEncounterCommand command)
    {
        var name = command.Request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name)) return false;

        var encounter = await readRepository.GetEncounterByIdAsync(command.EncounterId);
        if (encounter is null) return false;

        return await updateRepository.UpdateEncounterNameAsync(command.EncounterId, name);
    }
}

public class RenameEncounterCommand
{
    public RenameEncounterCommand(Guid encounterId, RenameEncounterRequest request)
    {
        EncounterId = encounterId;
        Request = request;
    }
    public Guid EncounterId { get; }
    public RenameEncounterRequest Request { get; }
}
