using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Admin;

public interface ICreatePlayerCommandHandler
{
    Task<(bool Success, string Error)> HandleAsync(CreatePlayerCommand command);
}

public class CreatePlayerCommandHandler(
    IUserReadRepository userReadRepository,
    IUserInsertRepository userInsertRepository,
    IPasswordHashingService passwordHashingService) : ICreatePlayerCommandHandler
{
    private const string DefaultPassword = "castingcards";

    public async Task<(bool Success, string Error)> HandleAsync(CreatePlayerCommand command)
    {
        if (await userReadRepository.ExistsByEmailAsync(command.Request.Email))
            return (false, "An account with that email address already exists.");

        var user = new UserDomain
        {
            Id           = Guid.NewGuid(),
            Email        = command.Request.Email,
            PasswordHash = passwordHashingService.Hash(DefaultPassword),
            DisplayName  = command.Request.DisplayName,
            Role         = Enum.Parse<UserRole>(command.Request.Role, true),
            CreatedAt    = DateTime.UtcNow,
        };

        await userInsertRepository.InsertAsync(user);
        return (true, null);
    }
}

public class CreatePlayerCommand
{
    public CreatePlayerCommand(CreatePlayerRequest request)
    {
        Request = request;
    }

    public CreatePlayerRequest Request { get; }
}
