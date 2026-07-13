using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Services;

public interface IJwtTokenService
{
    string GenerateToken(UserDomain user);
    string GenerateToken(UserDomain user, SubscriptionDomain? subscription);
}
public class JwtTokenService(IConfiguration configuration) : IJwtTokenService
{
    public string GenerateToken(UserDomain user)
    {
        return GenerateToken(user, null);
    }

    public string GenerateToken(UserDomain user, SubscriptionDomain? subscription)
    {
        var key    = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:Key"]!));
        var creds  = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("displayName", user.DisplayName),
            new Claim("tokenVersion", user.TokenVersion.ToString()),
        };

        var lockLevel = LockLevel.Suspended;
        var bypassPayment = false;
        var subscriptionStatus = "FreeTrial";
        var subscriptionId = string.Empty;
        var pricingModelId = (string?)null;
        var currentPeriodEnd = (DateTime?)null;
        var createdAt = DateTime.UtcNow;
        var pastDueSince = (DateTime?)null;

        if (subscription != null)
        {
            lockLevel = subscription.LockLevel;
            bypassPayment = subscription.BypassPayment;
            subscriptionStatus = subscription.Status.ToString();
            subscriptionId = subscription.Id.ToString();
            pricingModelId = subscription.PricingModelId?.ToString();
            currentPeriodEnd = subscription.CurrentPeriodEnd;
            createdAt = subscription.CreatedAt;
            pastDueSince = subscription.PastDueSince;
        }

        
        var isExempt = user.Role == UserRole.Admin || bypassPayment;
        if (isExempt)
        {
            lockLevel = LockLevel.FullAccess;
        }

        claims.Add(new Claim("lockLevel", lockLevel.ToString()));
        claims.Add(new Claim("bypassPayment", bypassPayment.ToString()));
        claims.Add(new Claim("subscriptionStatus", subscriptionStatus));
        claims.Add(new Claim("subscriptionId", subscriptionId));
        claims.Add(new Claim("userId", user.Id.ToString()));
        if (pricingModelId != null)
        {
            claims.Add(new Claim("pricingModelId", pricingModelId));
        }
        if (currentPeriodEnd.HasValue)
        {
            claims.Add(new Claim("currentPeriodEnd", currentPeriodEnd.Value.ToString("o")));
        }
        claims.Add(new Claim("createdAt", createdAt.ToString("o")));
        if (pastDueSince.HasValue)
        {
            claims.Add(new Claim("pastDueSince", pastDueSince.Value.ToString("o")));
        }

        var token = new JwtSecurityToken(
            issuer:    configuration["Jwt:Issuer"],
            audience:  configuration["Jwt:Audience"],
            claims:    claims,
            expires:   DateTime.UtcNow.AddHours(4),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
