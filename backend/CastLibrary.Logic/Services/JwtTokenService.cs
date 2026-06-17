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

        if (subscription != null)
        {
            lockLevel = subscription.LockLevel;
            bypassPayment = subscription.BypassPayment;
            subscriptionStatus = subscription.Status.ToString();
        }

        var isExempt = user.Role == UserRole.Admin || bypassPayment;
        if (isExempt)
        {
            lockLevel = LockLevel.FullAccess;
        }

        claims.Add(new Claim("lockLevel", lockLevel.ToString()));
        claims.Add(new Claim("bypassPayment", bypassPayment.ToString()));
        claims.Add(new Claim("subscriptionStatus", subscriptionStatus));

        var token = new JwtSecurityToken(
            issuer:    configuration["Jwt:Issuer"],
            audience:  configuration["Jwt:Audience"],
            claims:    claims,
            expires:   DateTime.UtcNow.AddDays(7),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
