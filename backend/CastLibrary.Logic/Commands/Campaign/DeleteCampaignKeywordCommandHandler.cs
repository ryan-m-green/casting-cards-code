using CastLibrary.Repository.Repositories.Delete;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IDeleteCampaignKeywordCommandHandler
{
    Task HandleAsync(DeleteCampaignKeywordCommand command);
}

public class DeleteCampaignKeywordCommandHandler(
    ICampaignKeywordDeleteRepository campaignKeywordDeleteRepository) : IDeleteCampaignKeywordCommandHandler
{
    public async Task HandleAsync(DeleteCampaignKeywordCommand command)
    {
        var normalized = (command.Keyword ?? string.Empty).Trim().ToLowerInvariant();
        if (normalized.Length == 0) return;

        await campaignKeywordDeleteRepository.DeleteAsync(command.DmUserId, command.CardType, normalized);
    }
}

public class DeleteCampaignKeywordCommand
{
    public DeleteCampaignKeywordCommand(Guid dmUserId, string cardType, string keyword)
    {
        DmUserId = dmUserId;
        CardType = cardType;
        Keyword = keyword;
    }

    public Guid DmUserId { get; }
    public string CardType { get; }
    public string Keyword { get; }
}
