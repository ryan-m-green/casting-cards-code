using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Sublocation;

public interface ICreateSublocationCommandHandler
{
    Task<SublocationDomain> HandleAsync(CreateSublocationCommand command);
}
public class CreateSublocationCommandHandler(ISublocationInsertRepository sublocationInsertRepository) : ICreateSublocationCommandHandler
{
    public async Task<SublocationDomain> HandleAsync(CreateSublocationCommand command)
    {
        var domain = new SublocationDomain
        {
            Id = Guid.NewGuid(),
            DmUserId = command.DmUserId,
            LocationId = command.Request.LocationId,
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
        return await sublocationInsertRepository.InsertAsync(domain);
    }
}

public class CreateSublocationCommand
{
    public CreateSublocationCommand(Guid dmUserId, CreateSublocationRequest request)
    {
        DmUserId = dmUserId;
        Request = request;
    }

    public Guid DmUserId { get; }
    public CreateSublocationRequest Request { get; }
}

