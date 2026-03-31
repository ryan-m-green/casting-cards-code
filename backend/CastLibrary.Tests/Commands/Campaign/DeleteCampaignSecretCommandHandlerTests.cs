using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Repository.Repositories;
using CastLibrary.Shared.Domain;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Campaign;

[TestFixture]
public class DeleteCampaignSecretCommandHandlerTests
{
    private ISecretRepository _secretRepository;
    private DeleteCampaignSecretCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _secretRepository = Substitute.For<ISecretRepository>();
        _handler = new DeleteCampaignSecretCommandHandler(_secretRepository);
    }

    [TestCase("DeleteCampaignSecretCommandHandler deletes secret successfully when valid")]
    public async Task HandleAsync_DeletesSecretWhenValid(string scenario)
    {
        // Arrange
        var secretId = Guid.NewGuid();
        var campaignId = Guid.NewGuid();

        var secret = new CampaignSecretDomain
        {
            Id = secretId,
            CampaignId = campaignId,
            Content = "Test Secret"
        };

        _secretRepository.GetByIdAsync(secretId).Returns(secret);

        // Act
        var result = await _handler.HandleAsync(secretId, campaignId);

        // Assert
        result.Should().BeTrue();
        await _secretRepository.Received(1).DeleteAsync(secretId);
    }

    [TestCase("DeleteCampaignSecretCommandHandler returns false when secret not found")]
    public async Task HandleAsync_ReturnsFalseWhenSecretNotFound(string scenario)
    {
        // Arrange
        var secretId = Guid.NewGuid();
        var campaignId = Guid.NewGuid();

        _secretRepository.GetByIdAsync(secretId).Returns((CampaignSecretDomain)null);

        // Act
        var result = await _handler.HandleAsync(secretId, campaignId);

        // Assert
        result.Should().BeFalse();
        await _secretRepository.DidNotReceive().DeleteAsync(Arg.Any<Guid>());
    }

    [TestCase("DeleteCampaignSecretCommandHandler returns false when campaign id mismatch")]
    public async Task HandleAsync_ReturnsFalseWhenCampaignIdMismatch(string scenario)
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
        result.Should().BeFalse();
        await _secretRepository.DidNotReceive().DeleteAsync(Arg.Any<Guid>());
    }

    [TestCase("DeleteCampaignSecretCommandHandler calls repository with correct id")]
    public async Task HandleAsync_CallsRepositoryWithCorrectId(string scenario)
    {
        // Arrange
        var secretId = Guid.NewGuid();
        var campaignId = Guid.NewGuid();

        var secret = new CampaignSecretDomain { Id = secretId, CampaignId = campaignId };

        _secretRepository.GetByIdAsync(secretId).Returns(secret);

        // Act
        await _handler.HandleAsync(secretId, campaignId);

        // Assert
        await _secretRepository.Received(1).DeleteAsync(Arg.Is<Guid>(x => x == secretId));
    }
}
