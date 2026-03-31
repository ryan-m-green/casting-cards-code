using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Campaign;

[TestFixture]
public class UpdateCityInstanceKeywordsCommandHandlerTests
{
    private ICampaignUpdateRepository _campaignUpdateRepository;
    private IUserRepository _userRepository;
    private UpdateCityInstanceKeywordsCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _campaignUpdateRepository = Substitute.For<ICampaignUpdateRepository>();
        _userRepository = Substitute.For<IUserRepository>();

        _handler = new UpdateCityInstanceKeywordsCommandHandler(
            _campaignUpdateRepository,
            _userRepository);
    }

    [TestCase("UpdateCityInstanceKeywordsCommandHandler normalizes keywords to lowercase")]
    public async Task HandleAsync_NormalizesKeywordsToLowercase(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new UpdateInstanceKeywordsRequest { Keywords = ["PEACEFUL", "Prosperous"] };

        // Act
        await _handler.HandleAsync(instanceId, dmUserId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateCityInstanceKeywordsAsync(
            instanceId,
            Arg.Any<string[]>());
    }

    [TestCase("UpdateCityInstanceKeywordsCommandHandler removes duplicates")]
    public async Task HandleAsync_RemovesDuplicates(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new UpdateInstanceKeywordsRequest { Keywords = ["peaceful", "Peaceful", "PEACEFUL"] };

        // Act
        await _handler.HandleAsync(instanceId, dmUserId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateCityInstanceKeywordsAsync(
            Arg.Any<Guid>(),
            Arg.Any<string[]>());
    }

    [TestCase("UpdateCityInstanceKeywordsCommandHandler trims whitespace")]
    public async Task HandleAsync_TrimsWhitespace(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new UpdateInstanceKeywordsRequest { Keywords = ["  peaceful  ", "  prosperous  "] };

        // Act
        await _handler.HandleAsync(instanceId, dmUserId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateCityInstanceKeywordsAsync(
            Arg.Any<Guid>(),
            Arg.Any<string[]>());
    }

    [TestCase("UpdateCityInstanceKeywordsCommandHandler filters empty keywords")]
    public async Task HandleAsync_FiltersEmptyKeywords(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new UpdateInstanceKeywordsRequest { Keywords = ["peaceful", "", "   ", "prosperous"] };

        // Act
        await _handler.HandleAsync(instanceId, dmUserId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateCityInstanceKeywordsAsync(
            Arg.Any<Guid>(),
            Arg.Any<string[]>());
    }

    [TestCase("UpdateCityInstanceKeywordsCommandHandler handles null keywords")]
    public async Task HandleAsync_HandlesNullKeywords(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new UpdateInstanceKeywordsRequest { Keywords = null };

        // Act
        await _handler.HandleAsync(instanceId, dmUserId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateCityInstanceKeywordsAsync(
            Arg.Any<Guid>(),
            Arg.Any<string[]>());
    }

    [TestCase("UpdateCityInstanceKeywordsCommandHandler merges keywords with user")]
    public async Task HandleAsync_MergesKeywordsWithUser(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new UpdateInstanceKeywordsRequest { Keywords = ["peaceful", "prosperous"] };

        // Act
        await _handler.HandleAsync(instanceId, dmUserId, request);

        // Assert
        await _userRepository.Received(1).MergeKeywordsAsync(
            Arg.Any<Guid>(),
            Arg.Any<string[]>());
    }

    [TestCase("UpdateCityInstanceKeywordsCommandHandler calls both repositories")]
    public async Task HandleAsync_CallsBothRepositories(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new UpdateInstanceKeywordsRequest { Keywords = ["test"] };

        // Act
        await _handler.HandleAsync(instanceId, dmUserId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateCityInstanceKeywordsAsync(
            Arg.Any<Guid>(),
            Arg.Any<string[]>());
        await _userRepository.Received(1).MergeKeywordsAsync(
            Arg.Any<Guid>(),
            Arg.Any<string[]>());
    }
}
