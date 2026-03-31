using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Location;

public interface IUpdateLocationCommandHandler
{
    Task<LocationDomain> HandleAsync(UpdateLocationCommand command);
}
public class UpdateLocationCommandHandler(
    ILocationReadRepository locationRepository,
    ILocationUpdateRepository locationUpdateRepository) : IUpdateLocationCommandHandler
{
    public async Task<LocationDomain> HandleAsync(UpdateLocationCommand command)
    {
        var existing = await locationRepository.GetByIdAsync(command.Id);
        if (existing is null || existing.DmUserId != command.DmUserId) return null;

        existing.CityId = command.Request.CityId;
        existing.Name = command.Request.Name;
        existing.Description = command.Request.Description;
        existing.ShopItems = command.Request.ShopItems.Select((item, i) => new ShopItemDomain
        {
            Id = Guid.NewGuid(), LocationId = command.Id, Name = item.Name,
            Price = item.Price, Description = item.Description, SortOrder = i,
        }).ToList();

        return await locationUpdateRepository.UpdateAsync(existing);
    }
}

public class UpdateLocationCommand
{
    public UpdateLocationCommand(Guid id, CreateLocationRequest request, Guid dmUserId)
    {
        Id = id;
        Request = request;
        DmUserId = dmUserId;
    }

    public Guid Id { get; }
    public CreateLocationRequest Request { get; }
    public Guid DmUserId { get; }
}
