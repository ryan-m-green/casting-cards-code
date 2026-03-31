using CastLibrary.Logic.Commands.Auth;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Auth;

[TestFixture]
public class RegisterUserCommandHandlerTests
{
    private IUserRepository _userRepository;
    private IPasswordHashingService _passwordHashingService;
    private IJwtTokenService _jwtTokenService;
    private RegisterUserCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _userRepository = Substitute.For<IUserRepository>();
        _passwordHashingService = Substitute.For<IPasswordHashingService>();
        _jwtTokenService = Substitute.For<IJwtTokenService>();

        _handler = new RegisterUserCommandHandler(
            _userRepository,
            _passwordHashingService,
            _jwtTokenService);
    }

    [TestCase("RegisterUserCommandHandler creates user and returns auth response")]
    [TestCase("RegisterUserCommandHandler calls methods in correct order")]
    [TestCase("RegisterUserCommandHandler hashes password before insertion")]
    [TestCase("RegisterUserCommandHandler generates token from saved user")]
    public async Task WhenValidRequest(string scenario)
    {
        // Arrange
        var request = new RegisterRequest
        {
            Email = "newuser@example.com",
            Password = "SecurePassword123",
            DisplayName = "New User",
            Role = "Player"
        };

        var callOrder = new List<string>();
        var passwordHash = "hashed_password";
        var userId = Guid.NewGuid();
        var savedUser = new UserDomain
        {
            Id = userId,
            Email = request.Email,
            PasswordHash = passwordHash,
            DisplayName = request.DisplayName,
            Role = UserRole.Player,
            CreatedAt = DateTime.UtcNow
        };

        var token = "jwt_token";

        _userRepository.ExistsByEmailAsync(request.Email).Returns(false);

        _passwordHashingService.Hash(request.Password).Returns(x =>
        {
            callOrder.Add("Hash");
            return passwordHash;
        });

        _userRepository.InsertAsync(Arg.Is<UserDomain>(u =>
            u.Email == request.Email &&
            u.DisplayName == request.DisplayName &&
            u.PasswordHash == passwordHash &&
            u.Role == UserRole.Player)).Returns(x =>
        {
            callOrder.Add("InsertAsync");
            return savedUser;
        });

        _jwtTokenService.GenerateToken(savedUser).Returns(x =>
        {
            callOrder.Add("GenerateToken");
            return token;
        });

        // Act
        var (result, error) = await _handler.HandleAsync(request);

        // Assert
        if (scenario == "creates user and returns auth response")
        {
            error.Should().BeNull();
            result.Should().NotBeNull();
            result.Token.Should().Be(token);
            result.User.Should().NotBeNull();
            result.User.Id.Should().Be(userId);
            result.User.Email.Should().Be(request.Email);
            result.User.DisplayName.Should().Be(request.DisplayName);
            result.User.Role.Should().Be("Player");
        }
        else if (scenario == "calls methods in correct order")
        {
            callOrder.Should().ContainInOrder("Hash", "InsertAsync", "GenerateToken");
        }
        else if (scenario == "hashes password before insertion")
        {
            _passwordHashingService.Received(1).Hash(request.Password);
            await _userRepository.Received(1).InsertAsync(Arg.Is<UserDomain>(u => u.PasswordHash == passwordHash));
        }
        else if (scenario == "generates token from saved user")
        {
            _jwtTokenService.Received(1).GenerateToken(Arg.Is<UserDomain>(u =>
                u.Id == userId &&
                u.Email == request.Email &&
                u.DisplayName == request.DisplayName));
        }
    }

    [TestCase("RegisterUserCommandHandler parses role correctly regardless of case when dm")]
    [TestCase("RegisterUserCommandHandler parses role correctly regardless of case when DM")]
    [TestCase("RegisterUserCommandHandler parses role correctly regardless of case when Dm")]
    public async Task ParsesRoleCorrectlyRegardlessOfCase(string scenario)
    {
        // Arrange
        var roleInput = scenario.EndsWith("dm") ? "dm" : scenario.EndsWith("Dm") ? "Dm" : "DM";
        var request = new RegisterRequest
        {
            Email = "dm@example.com",
            Password = "SecurePassword",
            DisplayName = "DM User",
            Role = roleInput
        };

        var passwordHash = "hashed";
        var savedUser = new UserDomain
        {
            Id = Guid.NewGuid(),
            Email = request.Email,
            PasswordHash = passwordHash,
            DisplayName = request.DisplayName,
            Role = UserRole.DM,
            CreatedAt = DateTime.UtcNow
        };

        _userRepository.ExistsByEmailAsync(request.Email).Returns(false);
        _passwordHashingService.Hash(request.Password).Returns(passwordHash);
        _userRepository.InsertAsync(Arg.Is<UserDomain>(u => u.Role == UserRole.DM)).Returns(savedUser);
        _jwtTokenService.GenerateToken(savedUser).Returns("token");

        // Act
        var (result, _) = await _handler.HandleAsync(request);

        // Assert
        result.User.Role.Should().Be("DM");
        await _userRepository.Received(1).InsertAsync(Arg.Is<UserDomain>(u => u.Role == UserRole.DM));
    }

    [TestCase("RegisterUserCommandHandler sets created at to current utc time")]
    public async Task SetsCreatedAtToCurrentUtcTime(string scenario)
    {
        // Arrange
        var request = new RegisterRequest
        {
            Email = "user@example.com",
            Password = "Password",
            DisplayName = "User",
            Role = "Player"
        };

        var passwordHash = "hashed";
        var savedUser = new UserDomain
        {
            Id = Guid.NewGuid(),
            Email = request.Email,
            PasswordHash = passwordHash,
            DisplayName = request.DisplayName,
            Role = UserRole.Player,
            CreatedAt = DateTime.UtcNow
        };

        _userRepository.ExistsByEmailAsync(request.Email).Returns(false);
        _passwordHashingService.Hash(request.Password).Returns(passwordHash);
        _userRepository.InsertAsync(Arg.Any<UserDomain>()).Returns(savedUser);
        _jwtTokenService.GenerateToken(savedUser).Returns("token");

        // Act
        await _handler.HandleAsync(request);

        // Assert
        await _userRepository.Received(1).InsertAsync(Arg.Is<UserDomain>(u =>
            u.CreatedAt > DateTime.UtcNow.AddSeconds(-5) &&
            u.CreatedAt <= DateTime.UtcNow));
    }
}
