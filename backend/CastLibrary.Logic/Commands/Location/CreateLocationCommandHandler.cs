using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Location;

public interface ICreateLocationCommandHandler
{
    Task<LocationDomain> HandleAsync(CreateLocationCommand command);
}
public class CreateLocationCommandHandler(ILocationInsertRepository locationInsertRepository) : ICreateLocationCommandHandler
{
    public async Task<LocationDomain> HandleAsync(CreateLocationCommand command)
    {
        var domain = new LocationDomain
        {
            Id = Guid.NewGuid(), 
            DmUserId = command.DmUserId, 
            CityId = command.Request.CityId,
            Name = command.Request.Name, Description = command.Request.Description,
            CreatedAt = DateTime.UtcNow,
            ShopItems = command.Request.ShopItems.Select((item, i) => new ShopItemDomain
            {
                Id = Guid.NewGuid(), 
                Name = item.Name, 
                Price = item.Price,
                Description = item.Description, SortOrder = i,
            }).ToList(),
        };
        return await locationInsertRepository.InsertAsync(domain);
    }
}

public class CreateLocationCommand
{
    public CreateLocationCommand(Guid dmUserId, CreateLocationRequest request)
    {
        DmUserId = dmUserId;
        Request = request;
    }

    public Guid DmUserId { get; }
    public CreateLocationRequest Request { get; }
}
