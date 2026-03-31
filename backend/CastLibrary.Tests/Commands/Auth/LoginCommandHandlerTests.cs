using CastLibrary.Logic.Commands.Auth;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Auth;

[TestFixture]
public class LoginCommandHandlerTests
{
    private IUserRepository _userRepository;
    private IPasswordHashingService _passwordHashingService;
    private IJwtTokenService _jwtTokenService;
    private LoginCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _userRepository = Substitute.For<IUserRepository>();
        _passwordHashingService = Substitute.For<IPasswordHashingService>();
        _jwtTokenService = Substitute.For<IJwtTokenService>();

        _handler = new LoginCommandHandler(
            _userRepository,
            _passwordHashingService,
            _jwtTokenService);
    }

    [TestCase("LoginCommandHandler returns auth response")]
    [TestCase("LoginCommandHandler calls methods in correct order")]
    [TestCase("LoginCommandHandler returns correct user data")]
    public async Task WhenValidCredentials(string scenario)
    {
        // Arrange
        var email = "user@example.com";
        var password = "SecurePassword123";
        var passwordHash = "hashed_password";
        var userId = Guid.NewGuid();
        var token = "jwt_token";

        var user = new UserDomain
        {
            Id = userId,
            Email = email,
            DisplayName = "Test User",
            PasswordHash = passwordHash,
            Role = UserRole.Player
        };

        var request = new LoginRequest { Email = email, Password = password };
        var callOrder = new List<string>();

        _userRepository.GetByEmailAsync(email).Returns(x =>
        {
            callOrder.Add("GetByEmailAsync");
            return user;
        });

        _passwordHashingService.Verify(password, passwordHash).Returns(x =>
        {
            callOrder.Add("Verify");
            return true;
        });

        _jwtTokenService.GenerateToken(user).Returns(x =>
        {
            callOrder.Add("GenerateToken");
            return token;
        });

        // Act
        var result = await _handler.HandleAsync(request);

        // Assert
        if (scenario == "returns auth response")
        {
            result.Should().NotBeNull();
            result.Token.Should().Be(token);
            result.User.Should().NotBeNull();
            result.User.Id.Should().Be(userId);
            result.User.Email.Should().Be(email);
            result.User.DisplayName.Should().Be("Test User");
            result.User.Role.Should().Be("Player");
        }
        else if (scenario == "calls methods in correct order")
        {
            callOrder.Should().ContainInOrder("GetByEmailAsync", "Verify", "GenerateToken");
        }
        else if (scenario == "returns correct user data")
        {
            result.User.Id.Should().Be(userId);
            result.User.Email.Should().Be(email);
            result.User.DisplayName.Should().Be("Test User");
            result.User.Role.Should().Be("Player");
        }
    }

    [TestCase("LoginCommandHandler returns null when user not found")]
    public async Task ReturnsNull_WhenUserNotFound(string scenario)
    {
        // Arrange
        var email = "nonexistent@example.com";
        var password = "SomePassword";
        var request = new LoginRequest { Email = email, Password = password };

        _userRepository.GetByEmailAsync(email).Returns((UserDomain)null);

        // Act
        var result = await _handler.HandleAsync(request);

        // Assert
        result.Should().BeNull();
        await _userRepository.Received(1).GetByEmailAsync(email);
        _passwordHashingService.DidNotReceive().Verify(Arg.Any<string>(), Arg.Any<string>());
        _jwtTokenService.DidNotReceive().GenerateToken(Arg.Any<UserDomain>());
    }

    [TestCase("LoginCommandHandler returns null when invalid password")]
    [TestCase("LoginCommandHandler does not call token generation when invalid password")]
    public async Task WhenInvalidPassword(string scenario)
    {
        // Arrange
        var email = "user@example.com";
        var password = "WrongPassword";
        var passwordHash = "correct_hash";
        var user = new UserDomain
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = passwordHash,
            DisplayName = "Test User",
            Role = UserRole.Player
        };

        var request = new LoginRequest { Email = email, Password = password };

        _userRepository.GetByEmailAsync(email).Returns(user);
        _passwordHashingService.Verify(password, passwordHash).Returns(false);

        // Act
        var result = await _handler.HandleAsync(request);

        // Assert
        if (scenario == "LoginCommandHandler returns null when invalid password")
        {
            result.Should().BeNull();
            await _userRepository.Received(1).GetByEmailAsync(email);
            _passwordHashingService.Received(1).Verify(password, passwordHash);
            _jwtTokenService.DidNotReceive().GenerateToken(Arg.Any<UserDomain>());
        }
        else if (scenario == "LoginCommandHandler does not call token generation when invalid password")
        {
            _jwtTokenService.DidNotReceive().GenerateToken(Arg.Any<UserDomain>());
        }
    }
}
