using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Repository.Repositories;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Campaign;

[TestFixture]
public class UpdateCastInstanceKeywordsCommandHandlerTests
{
    private ICampaignUpdateRepository _campaignUpdateRepository;
    private IUserRepository _userRepository;
    private UpdateCastInstanceKeywordsCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _campaignUpdateRepository = Substitute.For<ICampaignUpdateRepository>();
        _userRepository = Substitute.For<IUserRepository>();

        _handler = new UpdateCastInstanceKeywordsCommandHandler(
            _campaignUpdateRepository,
            _userRepository);
    }

    [TestCase("UpdateCastInstanceKeywordsCommandHandler normalizes keywords to lowercase")]
    public async Task HandleAsync_NormalizesKeywordsToLowercase(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new UpdateInstanceKeywordsRequest { Keywords = ["BRAVE", "Bold"] };

        // Act
        await _handler.HandleAsync(instanceId, dmUserId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateCastInstanceKeywordsAsync(
            Arg.Any<Guid>(),
            Arg.Any<string[]>());
    }

    [TestCase("UpdateCastInstanceKeywordsCommandHandler removes duplicates")]
    public async Task HandleAsync_RemovesDuplicates(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new UpdateInstanceKeywordsRequest { Keywords = ["brave", "Brave", "BRAVE"] };

        // Act
        await _handler.HandleAsync(instanceId, dmUserId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateCastInstanceKeywordsAsync(
            instanceId,
            Arg.Any<string[]>());
    }

    [TestCase("UpdateCastInstanceKeywordsCommandHandler trims whitespace")]
    public async Task HandleAsync_TrimsWhitespace(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new UpdateInstanceKeywordsRequest { Keywords = ["  brave  ", "  bold  "] };

        // Act
        await _handler.HandleAsync(instanceId, dmUserId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateCastInstanceKeywordsAsync(
            instanceId,
            Arg.Any<string[]>());
    }

    [TestCase("UpdateCastInstanceKeywordsCommandHandler filters empty keywords")]
    public async Task HandleAsync_FiltersEmptyKeywords(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new UpdateInstanceKeywordsRequest { Keywords = ["brave", "", "   ", "bold"] };

        // Act
        await _handler.HandleAsync(instanceId, dmUserId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateCastInstanceKeywordsAsync(
            Arg.Any<Guid>(),
            Arg.Any<string[]>());
    }

    [TestCase("UpdateCastInstanceKeywordsCommandHandler handles null keywords")]
    public async Task HandleAsync_HandlesNullKeywords(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new UpdateInstanceKeywordsRequest { Keywords = null };

        // Act
        await _handler.HandleAsync(instanceId, dmUserId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateCastInstanceKeywordsAsync(
            instanceId,
            Arg.Is<string[]>(arr => arr.Length == 0));
    }

    [TestCase("UpdateCastInstanceKeywordsCommandHandler merges keywords with user")]
    public async Task HandleAsync_MergesKeywordsWithUser(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new UpdateInstanceKeywordsRequest { Keywords = ["brave", "bold"] };

        // Act
        await _handler.HandleAsync(instanceId, dmUserId, request);

        // Assert
        await _userRepository.Received(1).MergeKeywordsAsync(
            Arg.Any<Guid>(),
            Arg.Any<string[]>());
    }

    [TestCase("UpdateCastInstanceKeywordsCommandHandler calls both repositories")]
    public async Task HandleAsync_CallsBothRepositories(string scenario)
    {
        // Arrange
        var instanceId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new UpdateInstanceKeywordsRequest { Keywords = ["test"] };

        // Act
        await _handler.HandleAsync(instanceId, dmUserId, request);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateCastInstanceKeywordsAsync(
            Arg.Any<Guid>(),
            Arg.Any<string[]>());
        await _userRepository.Received(1).MergeKeywordsAsync(
            Arg.Any<Guid>(),
            Arg.Any<string[]>());
    }
}
