using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Campaign;

[TestFixture]
public class UpdateLocationInstanceKeywordsCommandHandlerTests
{
    private ICampaignUpdateRepository _campaignUpdateRepository;
    private IUserRepository _userRepository;
    private UpdateLocationInstanceKeywordsCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _campaignUpdateRepository = Substitute.For<ICampaignUpdateRepository>();
        _userRepository = Substitute.For<IUserRepository>();

        _handler = new UpdateLocationInstanceKeywordsCommandHandler(
            _campaignUpdateRepository,
            _userRepository);
    }

    [TestCase("UpdateLocationInstanceKeywordsCommandHandler normalizes keywords to lowercase")]
    public async Task HandleAsync_NormalizesKeywordsToLowercase(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new UpdateInstanceKeywordsRequest { Keywords = ["DANGEROUS", "Remote"] };

        // Act
        await _handler.HandleAsync(instanceId, dmUserId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateLocationInstanceKeywordsAsync(
            Arg.Any<Guid>(),
            Arg.Any<string[]>());
    }

    [TestCase("UpdateLocationInstanceKeywordsCommandHandler removes duplicates")]
    public async Task HandleAsync_RemovesDuplicates(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new UpdateInstanceKeywordsRequest { Keywords = ["dangerous", "Dangerous", "DANGEROUS"] };

        // Act
        await _handler.HandleAsync(instanceId, dmUserId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateLocationInstanceKeywordsAsync(
            Arg.Any<Guid>(),
            Arg.Any<string[]>());
    }

    [TestCase("UpdateLocationInstanceKeywordsCommandHandler trims whitespace")]
    public async Task HandleAsync_TrimsWhitespace(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new UpdateInstanceKeywordsRequest { Keywords = ["  dangerous  ", "  remote  "] };

        // Act
        await _handler.HandleAsync(instanceId, dmUserId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateLocationInstanceKeywordsAsync(
            instanceId,
            Arg.Any<string[]>());
    }

    [TestCase("UpdateLocationInstanceKeywordsCommandHandler filters empty keywords")]
    public async Task HandleAsync_FiltersEmptyKeywords(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new UpdateInstanceKeywordsRequest { Keywords = ["dangerous", "", "   ", "remote"] };

        // Act
        await _handler.HandleAsync(instanceId, dmUserId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateLocationInstanceKeywordsAsync(
            Arg.Any<Guid>(),
            Arg.Any<string[]>());
    }

    [TestCase("UpdateLocationInstanceKeywordsCommandHandler handles null keywords")]
    public async Task HandleAsync_HandlesNullKeywords(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new UpdateInstanceKeywordsRequest { Keywords = null };

        // Act
        await _handler.HandleAsync(instanceId, dmUserId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateLocationInstanceKeywordsAsync(
            Arg.Any<Guid>(),
            Arg.Any<string[]>());
    }

    [TestCase("UpdateLocationInstanceKeywordsCommandHandler merges keywords with user")]
    public async Task HandleAsync_MergesKeywordsWithUser(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new UpdateInstanceKeywordsRequest { Keywords = ["dangerous", "remote"] };

        // Act
        await _handler.HandleAsync(instanceId, dmUserId, request);

        // Assert
        await _userRepository.Received(1).MergeKeywordsAsync(
            dmUserId,
            Arg.Any<string[]>());
    }

    [TestCase("UpdateLocationInstanceKeywordsCommandHandler calls both repositories")]
    public async Task HandleAsync_CallsBothRepositories(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new UpdateInstanceKeywordsRequest { Keywords = ["test"] };

        // Act
        await _handler.HandleAsync(instanceId, dmUserId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateLocationInstanceKeywordsAsync(
            Arg.Any<Guid>(),
            Arg.Any<string[]>());
        await _userRepository.Received(1).MergeKeywordsAsync(
            Arg.Any<Guid>(),
            Arg.Any<string[]>());
    }
}
