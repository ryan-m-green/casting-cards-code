using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.PlayerCard;

public interface IUpsertTraitCommandHandler
{
    Task<PlayerCardTraitDomain?> HandleAsync(UpsertTraitCommand command);
}

public class UpsertTraitCommandHandler(
    IPlayerCardReadRepository playerCardReadRepository,
    IPlayerCardTraitReadRepository traitReadRepository,
    IPlayerCardTraitInsertRepository traitInsertRepository,
    IPlayerCardTraitUpdateRepository traitUpdateRepository) : IUpsertTraitCommandHandler
{
    public async Task<PlayerCardTraitDomain?> HandleAsync(UpsertTraitCommand command)
    {
        var card = await playerCardReadRepository.GetByIdAsync(command.PlayerCardId);
        if (card is null || card.PlayerUserId != command.PlayerUserId) return null;

        if (command.Request.Id.HasValue)
        {
            var existing = await traitReadRepository.GetByIdAsync(command.Request.Id.Value);
            if (existing is null || existing.PlayerCardId != command.PlayerCardId) return null;

            await traitUpdateRepository.UpdateContentAsync(existing.Id, command.Request.Content);
            existing.Content = command.Request.Content;
            return existing;
        }

        var trait = new PlayerCardTraitDomain
        {
            Id = Guid.NewGuid(),
            PlayerCardId = command.PlayerCardId,
            TraitType = command.Request.TraitType,
            Content = command.Request.Content,
            IsCompleted = false,
            CreatedAt = DateTime.UtcNow,
        };
        return await traitInsertRepository.InsertAsync(trait);
    }
}

public class UpsertTraitCommand
{
    public UpsertTraitCommand(Guid playerCardId, Guid playerUserId, UpsertTraitRequest request)
    {
        PlayerCardId = playerCardId;
        PlayerUserId = playerUserId;
        Request = request;
    }

    public Guid PlayerCardId { get; }
    public Guid PlayerUserId { get; }
    public UpsertTraitRequest Request { get; }
}
