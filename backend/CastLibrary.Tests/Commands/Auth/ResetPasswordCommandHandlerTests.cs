using CastLibrary.Logic.Commands.Auth;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Auth;

[TestFixture]
public class ResetPasswordCommandHandlerTests
{
    private IPasswordResetTokenRepository _tokenRepository;
    private IUserRepository _userRepository;
    private IPasswordHashingService _passwordHashingService;
    private ResetPasswordCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _tokenRepository = Substitute.For<IPasswordResetTokenRepository>();
        _userRepository = Substitute.For<IUserRepository>();
        _passwordHashingService = Substitute.For<IPasswordHashingService>();

        _handler = new ResetPasswordCommandHandler(
            _tokenRepository,
            _userRepository,
            _passwordHashingService);
    }

    [TestCase("resets password successfully")]
    [TestCase("calls methods in correct order")]
    [TestCase("hashes new password before update")]
    [TestCase("marks token as used")]
    public async Task ResetPasswordCommandHandler_WhenValidToken(string scenario)
    {
        // Arrange
        var rawToken = "valid_token";
        var userId = Guid.NewGuid();
        var newPassword = "NewPassword";
        var tokenId = Guid.NewGuid();
        var callOrder = new List<string>();

        var token = new PasswordResetTokenDomain
        {
            Id = tokenId,
            UserId = userId,
            TokenHash = "hash",
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            UsedAt = null
        };

        var request = new ResetPasswordRequest { Token = rawToken, NewPassword = newPassword };
        var newPasswordHash = "hashed";

        _tokenRepository.GetByTokenHashAsync(Arg.Any<string>()).Returns(x =>
        {
            callOrder.Add("GetByTokenHashAsync");
            return token;
        });

        _passwordHashingService.Hash(newPassword).Returns(x =>
        {
            callOrder.Add("Hash");
            return newPasswordHash;
        });

        _userRepository.UpdatePasswordAsync(userId, newPasswordHash).Returns(x =>
        {
            callOrder.Add("UpdatePasswordAsync");
            return Task.CompletedTask;
        });

        _tokenRepository.MarkUsedAsync(tokenId).Returns(x =>
        {
            callOrder.Add("MarkUsedAsync");
            return Task.CompletedTask;
        });

        // Act
        var result = await _handler.HandleAsync(request);

        // Assert
        if (scenario == "resets password successfully")
        {
            result.Success.Should().BeTrue();
            result.Error.Should().BeNull();
        }
        else if (scenario == "calls methods in correct order")
        {
            callOrder.Should().ContainInOrder(
                "GetByTokenHashAsync",
                "Hash",
                "UpdatePasswordAsync",
                "MarkUsedAsync");
        }
        else if (scenario == "hashes new password before update")
        {
            _passwordHashingService.Received(1).Hash(newPassword);
            await _userRepository.Received(1).UpdatePasswordAsync(userId, newPasswordHash);
        }
        else if (scenario == "marks token as used")
        {
            await _tokenRepository.Received(1).MarkUsedAsync(tokenId);
        }
    }

    [TestCase("ResetPasswordCommandHandler returns error message when token not found")]
    public async Task ReturnsErrorMessage_WhenTokenNotFound(string scenario)
    {
        // Arrange
        var rawToken = "invalid_token";
        var request = new ResetPasswordRequest { Token = rawToken, NewPassword = "NewPassword" };
        var expectedError = "Invalid or expired reset link.";

        _tokenRepository.GetByTokenHashAsync(Arg.Any<string>()).Returns((PasswordResetTokenDomain)null);

        // Act
        var result = await _handler.HandleAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Be(expectedError);
        await _tokenRepository.Received(1).GetByTokenHashAsync(Arg.Any<string>());
        await _userRepository.DidNotReceive().UpdatePasswordAsync(Arg.Any<Guid>(), Arg.Any<string>());
    }

    [TestCase("ResetPasswordCommandHandler returns error message when token expired")]
    public async Task ReturnsErrorMessage_WhenTokenExpired(string scenario)
    {
        // Arrange
        var rawToken = "expired_token";
        var tokenId = Guid.NewGuid();
        var expectedError = "Invalid or expired reset link.";

        var expiredToken = new PasswordResetTokenDomain
        {
            Id = tokenId,
            UserId = Guid.NewGuid(),
            TokenHash = "hash",
            ExpiresAt = DateTime.UtcNow.AddSeconds(-1),
            UsedAt = null
        };

        var request = new ResetPasswordRequest { Token = rawToken, NewPassword = "NewPassword" };

        _tokenRepository.GetByTokenHashAsync(Arg.Any<string>()).Returns(expiredToken);

        // Act
        var result = await _handler.HandleAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Be(expectedError);
        await _userRepository.DidNotReceive().UpdatePasswordAsync(Arg.Any<Guid>(), Arg.Any<string>());
        await _tokenRepository.DidNotReceive().MarkUsedAsync(Arg.Any<Guid>());
    }

    [TestCase("ResetPasswordCommandHandler returns error message when token already used")]
    public async Task ReturnsErrorMessage_WhenTokenAlreadyUsed(string scenario)
    {
        // Arrange
        var rawToken = "used_token";
        var tokenId = Guid.NewGuid();
        var expectedError = "Invalid or expired reset link.";

        var usedToken = new PasswordResetTokenDomain
        {
            Id = tokenId,
            UserId = Guid.NewGuid(),
            TokenHash = "hash",
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            UsedAt = DateTime.UtcNow.AddMinutes(-10)
        };

        var request = new ResetPasswordRequest { Token = rawToken, NewPassword = "NewPassword" };

        _tokenRepository.GetByTokenHashAsync(Arg.Any<string>()).Returns(usedToken);

        // Act
        var result = await _handler.HandleAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Be(expectedError);
        await _userRepository.DidNotReceive().UpdatePasswordAsync(Arg.Any<Guid>(), Arg.Any<string>());
        await _tokenRepository.DidNotReceive().MarkUsedAsync(Arg.Any<Guid>());
    }

    [TestCase("ResetPasswordCommandHandler does not mark token as used when password update fails")]
    public async Task DoesNotMarkTokenAsUsed_WhenPasswordUpdateFails(string scenario)
    {
        // Arrange
        var rawToken = "valid_token";
        var tokenId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var token = new PasswordResetTokenDomain
        {
            Id = tokenId,
            UserId = userId,
            TokenHash = "hash",
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            UsedAt = null
        };

        var request = new ResetPasswordRequest { Token = rawToken, NewPassword = "NewPassword" };

        _tokenRepository.GetByTokenHashAsync(Arg.Any<string>()).Returns(token);
        _passwordHashingService.Hash(request.NewPassword).Returns("hashed");
        _userRepository.UpdatePasswordAsync(userId, "hashed")
            .Returns(Task.FromException(new Exception("Database error")));

        // Act
        var act = async () => await _handler.HandleAsync(request);

        // Assert
        await act.Should().ThrowAsync<Exception>();
        await _tokenRepository.DidNotReceive().MarkUsedAsync(Arg.Any<Guid>());
    }
}
