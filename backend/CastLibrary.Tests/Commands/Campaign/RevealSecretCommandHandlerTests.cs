using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Repository.Repositories;
using CastLibrary.Shared.Domain;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Campaign;

[TestFixture]
public class RevealSecretCommandHandlerTests
{
    private ISecretRepository _secretRepository;
    private RevealSecretCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _secretRepository = Substitute.For<ISecretRepository>();
        _handler = new RevealSecretCommandHandler(_secretRepository);
    }

    [TestCase("RevealSecretCommandHandler reveals secret when found")]
    public async Task HandleAsync_RevealsSecretWhenFound(string scenario)
    {
        // Arrange
        var secretId = Guid.NewGuid();
        var campaignId = Guid.NewGuid();

        var secret = new CampaignSecretDomain
        {
            Id = secretId,
            CampaignId = campaignId,
            Content = "Test Secret",
            IsRevealed = false
        };

        _secretRepository.GetByIdAsync(secretId).Returns(secret);

        // Act
        var result = await _handler.HandleAsync(secretId, campaignId);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(secretId);
        result.IsRevealed.Should().BeTrue();
    }

    [TestCase("RevealSecretCommandHandler returns null when secret not found")]
    public async Task HandleAsync_ReturnsNullWhenSecretNotFound(string scenario)
    {
        // Arrange
        var secretId = Guid.NewGuid();
        var campaignId = Guid.NewGuid();

        _secretRepository.GetByIdAsync(secretId).Returns((CampaignSecretDomain)null);

        // Act
        var result = await _handler.HandleAsync(secretId, campaignId);

        // Assert
        result.Should().BeNull();
        await _secretRepository.DidNotReceive().RevealAsync(Arg.Any<Guid>(), Arg.Any<DateTime>());
    }

    [TestCase("RevealSecretCommandHandler returns null when campaign id mismatch")]
    public async Task HandleAsync_ReturnsNullWhenCampaignIdMismatch(string scenario)
    {
        // Arrange
        var secretId = Guid.NewGuid();
        var campaignId = Guid.NewGuid();
        var differentCampaignId = Guid.NewGuid();

        var secret = new CampaignSecretDomain
        {
            Id = secretId,
            CampaignId = differentCampaignId,
            Content = "Test Secret"
        };

        _secretRepository.GetByIdAsync(secretId).Returns(secret);

        // Act
        var result = await _handler.HandleAsync(secretId, campaignId);

        // Assert
        result.Should().BeNull();
        await _secretRepository.DidNotReceive().RevealAsync(Arg.Any<Guid>(), Arg.Any<DateTime>());
    }

    [TestCase("RevealSecretCommandHandler calls repository reveal method")]
    public async Task HandleAsync_CallsRepositoryRevealMethod(string scenario)
    {
        // Arrange
        var secretId = Guid.NewGuid();
        var campaignId = Guid.NewGuid();
        var before = DateTime.UtcNow;

        var secret = new CampaignSecretDomain
        {
            Id = secretId,
            CampaignId = campaignId,
            IsRevealed = false
        };

        _secretRepository.GetByIdAsync(secretId).Returns(secret);

        // Act
        await _handler.HandleAsync(secretId, campaignId);

        // Assert
        await _secretRepository.Received(1).RevealAsync(
            Arg.Is<Guid>(x => x == secretId),
            Arg.Is<DateTime>(x => x >= before && x <= DateTime.UtcNow));
    }

    [TestCase("RevealSecretCommandHandler sets revealed timestamp")]
    public async Task HandleAsync_SetsRevealedTimestamp(string scenario)
    {
        // Arrange
        var secretId = Guid.NewGuid();
        var campaignId = Guid.NewGuid();
        var before = DateTime.UtcNow;

        var secret = new CampaignSecretDomain
        {
            Id = secretId,
            CampaignId = campaignId,
            IsRevealed = false
        };

        _secretRepository.GetByIdAsync(secretId).Returns(secret);

        // Act
        var result = await _handler.HandleAsync(secretId, campaignId);

        // Assert
        result.RevealedAt.Should().BeCloseTo(before, TimeSpan.FromSeconds(1));
    }
}
