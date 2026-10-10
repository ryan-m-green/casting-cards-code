using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Cast;

public interface IUpdateCastCommandHandler
{
    Task<CastDomain> HandleAsync(UpdateCastCommand command);
}
public class UpdateCastCommandHandler(
    ICastReadRepository castReadRepository,
    ICastUpdateRepository castUpdateRepository,
    ICampaignKeywordInsertRepository campaignKeywordInsertRepository) : IUpdateCastCommandHandler
{
    public async Task<CastDomain> HandleAsync(UpdateCastCommand command)
    {
        var existing = await castReadRepository.GetByIdAsync(command.Id);
        if (existing is null || existing.DmUserId != command.DmUserId) return null;

        existing.Name = command.Request.Name;
        existing.Pronouns = command.Request.Pronouns;
        existing.Race = command.Request.Race;
        existing.Role = command.Request.Role;
        existing.Age = command.Request.Age;
        existing.MaxHitPoints = command.Request.MaxHitPoints;
        existing.Posture = command.Request.Posture;
        existing.Speed = command.Request.Speed;
        existing.Keywords = command.Request.Keywords;
        existing.VoiceNotes = command.Request.VoiceNotes;
        existing.Description = command.Request.Description;
        existing.PublicDescription = command.Request.PublicDescription;

        var result = await castUpdateRepository.UpdateAsync(existing);
        await campaignKeywordInsertRepository.MergeKeywordsAsync(command.DmUserId, "cast", existing.Keywords);
        return result;
    }
}

public class UpdateCastCommand
{
    public UpdateCastCommand(Guid id, CreateCastRequest request, Guid dmUserId)
    {
        Id = id;
        Request = request;
        DmUserId = dmUserId;
    }

    public Guid Id { get; }
    public CreateCastRequest Request { get; }
    public Guid DmUserId { get; }
}
