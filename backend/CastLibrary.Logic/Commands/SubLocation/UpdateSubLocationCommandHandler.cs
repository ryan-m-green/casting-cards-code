using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Sublocation;

public interface IUpdateSublocationCommandHandler
{
    Task<SublocationDomain> HandleAsync(UpdateSublocationCommand command);
}
public class UpdateSublocationCommandHandler(
    ISublocationReadRepository sublocationRepository,
    ISublocationUpdateRepository sublocationUpdateRepository) : IUpdateSublocationCommandHandler
{
    public async Task<SublocationDomain> HandleAsync(UpdateSublocationCommand command)
    {
        var existing = await sublocationRepository.GetByIdAsync(command.Id);
        if (existing is null || existing.DmUserId != command.DmUserId) return null;

        existing.CityId = command.Request.CityId;
        existing.Name = command.Request.Name;
        existing.Description = command.Request.Description;
        existing.ShopItems = command.Request.ShopItems.Select((item, i) => new ShopItemDomain
        {
            Id = Guid.NewGuid(), SublocationId = command.Id, Name = item.Name,
            Price = item.Price, Description = item.Description, SortOrder = i,
        }).ToList();

        return await sublocationUpdateRepository.UpdateAsync(existing);
    }
}

public class UpdateSublocationCommand
{
    public UpdateSublocationCommand(Guid id, CreateSublocationRequest request, Guid dmUserId)
    {
        Id = id;
        Request = request;
        DmUserId = dmUserId;
    }

    public Guid Id { get; }
    public CreateSublocationRequest Request { get; }
    public Guid DmUserId { get; }
}
