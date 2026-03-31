using CastLibrary.Logic.Commands.CampaignNote;
using CastLibrary.Repository.Repositories;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.CampaignNote;

[TestFixture]
public class UpsertCampaignNoteCommandHandlerTests
{
    private INoteRepository _noteRepository;
    private IUserRepository _userRepository;
    private UpsertCampaignNoteCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _noteRepository = Substitute.For<INoteRepository>();
        _userRepository = Substitute.For<IUserRepository>();

        _handler = new UpsertCampaignNoteCommandHandler(_noteRepository, _userRepository);
    }

    [TestCase("UpsertCampaignNoteCommandHandler creates note successfully")]
    [TestCase("UpsertCampaignNoteCommandHandler returns created note")]
    public async Task ExecuteAsync_WhenValidRequest(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var instanceId = Guid.NewGuid();

        var request = new UpsertCampaignNoteRequest
        {
            EntityType = EntityType.Cast,
            InstanceId = instanceId,
            Content = "Test note content"
        };

        var user = new UserDomain { Id = userId, DisplayName = "Test User" };

        _userRepository.GetByIdAsync(userId).Returns(user);
        _noteRepository.UpsertAsync(Arg.Any<CampaignNoteDomain>()).Returns(x => x.ArgAt<CampaignNoteDomain>(0));

        // Act
        var result = await _handler.ExecuteAsync(campaignId, request, userId);

        // Assert
        result.Should().NotBeNull();
        result.CampaignId.Should().Be(campaignId);
        result.EntityType.Should().Be(EntityType.Cast);
        result.Content.Should().Be("Test note content");
    }

    [TestCase("UpsertCampaignNoteCommandHandler sets created by user info")]
    public async Task ExecuteAsync_SetsCreatedByUserInfo(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var instanceId = Guid.NewGuid();
        var displayName = "Test User";

        var request = new UpsertCampaignNoteRequest
        {
            EntityType = EntityType.Cast,
            InstanceId = instanceId,
            Content = "Note content"
        };

        var user = new UserDomain { Id = userId, DisplayName = displayName };

        _userRepository.GetByIdAsync(userId).Returns(user);
        _noteRepository.UpsertAsync(Arg.Any<CampaignNoteDomain>()).Returns(x => x.ArgAt<CampaignNoteDomain>(0));

        // Act
        var result = await _handler.ExecuteAsync(campaignId, request, userId);

        // Assert
        result.CreatedByUserId.Should().Be(userId);
        result.CreatedByDisplayName.Should().Be(displayName);
    }

    [TestCase("UpsertCampaignNoteCommandHandler handles null user")]
    public async Task ExecuteAsync_HandlesNullUser(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var instanceId = Guid.NewGuid();

        var request = new UpsertCampaignNoteRequest
        {
            EntityType = EntityType.Cast,
            InstanceId = instanceId,
            Content = "Note content"
        };

        _userRepository.GetByIdAsync(userId).Returns((UserDomain)null);
        _noteRepository.UpsertAsync(Arg.Any<CampaignNoteDomain>()).Returns(x => x.ArgAt<CampaignNoteDomain>(0));

        // Act
        var result = await _handler.ExecuteAsync(campaignId, request, userId);

        // Assert
        result.CreatedByDisplayName.Should().Be("Unknown");
    }

    [TestCase("UpsertCampaignNoteCommandHandler sets timestamps")]
    public async Task ExecuteAsync_SetsTimestamps(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var before = DateTime.UtcNow;

        var request = new UpsertCampaignNoteRequest
        {
            EntityType = EntityType.Cast,
            InstanceId = Guid.NewGuid(),
            Content = "Note"
        };

        var user = new UserDomain { Id = userId, DisplayName = "User" };

        _userRepository.GetByIdAsync(userId).Returns(user);
        _noteRepository.UpsertAsync(Arg.Any<CampaignNoteDomain>()).Returns(x => x.ArgAt<CampaignNoteDomain>(0));

        // Act
        var result = await _handler.ExecuteAsync(campaignId, request, userId);

        // Assert
        result.CreatedAt.Should().BeCloseTo(before, TimeSpan.FromSeconds(1));
        result.UpdatedAt.Should().BeCloseTo(before, TimeSpan.FromSeconds(1));
    }

    [TestCase("UpsertCampaignNoteCommandHandler calls repository upsert")]
    public async Task ExecuteAsync_CallsRepositoryUpsert(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var instanceId = Guid.NewGuid();

        var request = new UpsertCampaignNoteRequest
        {
            EntityType = EntityType.City,
            InstanceId = instanceId,
            Content = "City note"
        };

        var user = new UserDomain { Id = userId, DisplayName = "User" };

        _userRepository.GetByIdAsync(userId).Returns(user);
        _noteRepository.UpsertAsync(Arg.Any<CampaignNoteDomain>()).Returns(x => x.ArgAt<CampaignNoteDomain>(0));

        // Act
        await _handler.ExecuteAsync(campaignId, request, userId);

        // Assert
        await _noteRepository.Received(1).UpsertAsync(
            Arg.Is<CampaignNoteDomain>(n =>
                n.CampaignId == campaignId &&
                n.EntityType == EntityType.City &&
                n.Content == "City note" &&
                n.CreatedByUserId == userId));
    }
}
