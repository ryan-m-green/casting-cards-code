using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using CastLibrary.Shared.Enums;
namespace CastLibrary.Repository.Mappers;

public interface IUserEntityMapper
{
    UserDomain ToDomain(UserEntity entity);
    UserEntity ToEntity(UserDomain domain);
}
public class UserEntityMapper : IUserEntityMapper
{
    public UserDomain ToDomain(UserEntity entity) => new()
    {
        Id = entity.Id,
        Email = entity.Email,
        PasswordHash = entity.PasswordHash,
        DisplayName = entity.DisplayName,
        Role = Enum.Parse<UserRole>(entity.Role, true),
        Keywords = entity.Keywords ?? [],
        CreatedAt = entity.CreatedAt,
    };

    public UserEntity ToEntity(UserDomain domain)
    {
        return new UserEntity()
        {
            Id = domain.Id,
            CreatedAt = domain.CreatedAt,
            DisplayName = domain.DisplayName,
            Email = domain.Email,
            Keywords = domain.Keywords,
            PasswordHash = domain.PasswordHash,
            Role = domain.Role.ToString(),
        };
    }
}
