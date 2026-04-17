using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.PlayerCard;

public interface IUpsertPlayerCastPerceptionCommandHandler
{
    Task<PlayerCastPerceptionDomain?> HandleAsync(UpsertPlayerCastPerceptionCommand command);
}

public class UpsertPlayerCastPerceptionCommandHandler(
    IPlayerCardReadRepository playerCardReadRepository,
    IPlayerCastPerceptionReadRepository perceptionReadRepository,
    IPlayerCastPerceptionInsertRepository perceptionInsertRepository,
    IPlayerCastPerceptionUpdateRepository perceptionUpdateRepository) : IUpsertPlayerCastPerceptionCommandHandler
{
    public async Task<PlayerCastPerceptionDomain?> HandleAsync(UpsertPlayerCastPerceptionCommand command)
    {
        var card = await playerCardReadRepository.GetByIdAsync(command.PlayerCardId);
        if (card is null || card.PlayerUserId != command.PlayerUserId) return null;

        var existing = await perceptionReadRepository.GetByPlayerCardAndInstanceAsync(
            command.PlayerCardId,
            command.Request.CastInstanceId,
            command.Request.LocationInstanceId,
            command.Request.SublocationInstanceId);

        if (existing is not null)
        {
            await perceptionUpdateRepository.UpdateImpressionAsync(existing.Id, command.Request.Impression, DateTime.UtcNow);
            existing.Impression = command.Request.Impression;
            existing.UpdatedAt = DateTime.UtcNow;
            return existing;
        }

        var now = DateTime.UtcNow;
        var perception = new PlayerCastPerceptionDomain
        {
            Id = Guid.NewGuid(),
            PlayerCardId = command.PlayerCardId,
            CastInstanceId = command.Request.CastInstanceId,
            LocationInstanceId = command.Request.LocationInstanceId,
            SublocationInstanceId = command.Request.SublocationInstanceId,
            Impression = command.Request.Impression,
            CreatedAt = now,
            UpdatedAt = now,
        };
        return await perceptionInsertRepository.InsertAsync(perception);
    }
}

public class UpsertPlayerCastPerceptionCommand
{
    public UpsertPlayerCastPerceptionCommand(Guid playerCardId, Guid playerUserId, UpsertPlayerCastPerceptionRequest request)
    {
        PlayerCardId = playerCardId;
        PlayerUserId = playerUserId;
        Request = request;
    }

    public Guid PlayerCardId { get; }
    public Guid PlayerUserId { get; }
    public UpsertPlayerCastPerceptionRequest Request { get; }
}
