using CastLibrary.Shared.Enums;
using System.Security.Claims;

namespace CastLibrary.WebHost.MetadataHelpers
{
    public interface IUserRetriever
    {
        Guid GetDmUserId(ClaimsPrincipal user);
        Guid GetUserId(ClaimsPrincipal user);
        bool IsPlayer(ClaimsPrincipal user);
    }
    public class UserRetriever : IUserRetriever
    {
        public Guid GetUserId(ClaimsPrincipal user)
        {
            var userIdString = user.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString();

            return Guid.Parse(userIdString);
        }

        public Guid GetDmUserId(ClaimsPrincipal user)
        {
            if (IsPlayer(user)) return Guid.Empty;

            var userIdString = user.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString();

            return Guid.Parse(userIdString);
        }

        public bool IsPlayer(ClaimsPrincipal user)
        {
            return user.FindFirst(ClaimTypes.Role)?.Value == UserRole.Player.ToString();
        }
    }
}
