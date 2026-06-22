using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http;

namespace CastLibrary.Tests;

[TestFixture]
public class CookieConfigurationTests
{
    [Test]
    public void Authentication_Cookie_Should_Have_Correct_Configuration()
    {
        // Arrange
        var factory = new WebApplicationFactory<Program>();
        
        // Act
        var serviceProvider = factory.Services;
        var cookieOptions = serviceProvider.GetRequiredService<IOptionsMonitor<CookieAuthenticationOptions>>()
            .Get("Cookies");

        // Assert
        Assert.That(cookieOptions.Cookie.Name, Is.EqualTo("casting_cards_token"));
        Assert.That(cookieOptions.Cookie.HttpOnly, Is.True);
        Assert.That(cookieOptions.Cookie.SameSite, Is.EqualTo(SameSiteMode.Lax));
        Assert.That(cookieOptions.Cookie.Path, Is.EqualTo("/"));
        Assert.That(cookieOptions.ExpireTimeSpan, Is.EqualTo(TimeSpan.FromHours(4)));
        Assert.That(cookieOptions.SlidingExpiration, Is.True);
    }

    [Test]
    public void Antiforgery_Cookie_Should_Have_Correct_Configuration()
    {
        // Arrange
        var factory = new WebApplicationFactory<Program>();
        
        // Act
        var serviceProvider = factory.Services;
        var antiforgeryOptions = serviceProvider.GetRequiredService<IOptions<AntiforgeryOptions>>().Value;

        // Assert
        Assert.That(antiforgeryOptions.Cookie.Name, Is.EqualTo("XSRF-TOKEN"));
        Assert.That(antiforgeryOptions.Cookie.HttpOnly, Is.False);
        Assert.That(antiforgeryOptions.Cookie.SameSite, Is.EqualTo(SameSiteMode.Lax));
        Assert.That(antiforgeryOptions.Cookie.Path, Is.EqualTo("/"));
        Assert.That(antiforgeryOptions.HeaderName, Is.EqualTo("X-XSRF-TOKEN"));
        Assert.That(antiforgeryOptions.FormFieldName, Is.EqualTo("XSRF-TOKEN"));
    }

    [Test]
    [TestCase("Development", CookieSecurePolicy.None)]
    [TestCase("Production", CookieSecurePolicy.Always)]
    public void Cookie_Secure_Flag_Should_Be_Environment_Dependent(string environment, CookieSecurePolicy expectedPolicy)
    {
        // Arrange
        var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(environment);
        });

        // Act
        var serviceProvider = factory.Services;
        var cookieOptions = serviceProvider.GetRequiredService<IOptionsMonitor<CookieAuthenticationOptions>>()
            .Get("Cookies");

        // Assert
        Assert.That(cookieOptions.Cookie.SecurePolicy, Is.EqualTo(expectedPolicy));
    }
}
