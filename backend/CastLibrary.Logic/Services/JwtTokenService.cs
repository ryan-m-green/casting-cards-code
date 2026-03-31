using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Services;

public interface IJwtTokenService
{
    string GenerateToken(UserDomain user);
}
public class JwtTokenService(IConfiguration configuration) : IJwtTokenService
{
    public string GenerateToken(UserDomain user)
    {
        var key    = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:Key"]!));
        var creds  = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("displayName", user.DisplayName),
        };

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
