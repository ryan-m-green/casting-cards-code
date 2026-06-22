using CastLibrary.Shared.Enums;
using System.Security.Claims;

namespace CastLibrary.WebHost.MetadataHelpers
{
    public interface IUserRetriever
    {
        Guid GetDmUserId(ClaimsPrincipal user);
        Guid GetUserId(ClaimsPrincipal user);
        string GetEmail(ClaimsPrincipal user);
        bool IsPlayer(ClaimsPrincipal user);
        LockLevel GetLockLevel(ClaimsPrincipal user);
        bool GetBypassPayment(ClaimsPrincipal user);
        bool IsFreeTrial(ClaimsPrincipal user);
    }
    public class UserRetriever : IUserRetriever
    {
        public Guid GetUserId(ClaimsPrincipal user)
        {
            var userIdString = user.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString();

            return Guid.Parse(userIdString);
        }

        public string GetEmail(ClaimsPrincipal user)
        {
            return user.FindFirst(ClaimTypes.Email)?.Value ?? "Unknown";
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

        public LockLevel GetLockLevel(ClaimsPrincipal user)
        {
            var lockLevelClaim = user.FindFirst("lockLevel")?.Value;
            if (string.IsNullOrEmpty(lockLevelClaim) || !Enum.TryParse<LockLevel>(lockLevelClaim, out var lockLevel))
            {
                return LockLevel.FullAccess;
            }
            return lockLevel;
        }

        public bool GetBypassPayment(ClaimsPrincipal user)
        {
            var bypassPaymentClaim = user.FindFirst("bypassPayment")?.Value;
            if (string.IsNullOrEmpty(bypassPaymentClaim) || !bool.TryParse(bypassPaymentClaim, out var bypassPayment))
            {
                return false;
            }
            return bypassPayment;
        }

        public bool IsFreeTrial(ClaimsPrincipal user)
        {
            var subscriptionStatusClaim = user.FindFirst("subscriptionStatus")?.Value;
            return subscriptionStatusClaim == "FreeTrial";
        }
    }
}
