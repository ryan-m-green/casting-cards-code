using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Campaign;

[TestFixture]
public class UpdateCampaignCommandHandlerTests
{
    private ICampaignReadRepository _campaignReadRepository;
    private ICampaignUpdateRepository _campaignUpdateRepository;
    private UpdateCampaignCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _campaignReadRepository = Substitute.For<ICampaignReadRepository>();
        _campaignUpdateRepository = Substitute.For<ICampaignUpdateRepository>();
        _handler = new UpdateCampaignCommandHandler(_campaignReadRepository, _campaignUpdateRepository);
    }

    [TestCase("UpdateCampaignCommandHandler updates campaign successfully")]
    [TestCase("UpdateCampaignCommandHandler returns updated campaign")]
    public async Task HandleAsync_WhenValidRequest(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var request = new UpdateCampaignRequest
        {
            Name = "Updated Campaign",
            FantasyType = "Dark Fantasy",
            Description = "Updated Description",
            SpineColor = "#FF0000"
        };

        var campaign = new CampaignDomain
        {
            Id = campaignId,
            DmUserId = userId,
            Name = "Old Name",
            FantasyType = "Light Fantasy",
            Description = "Old Description",
            SpineColor = "#00FF00"
        };

        _campaignReadRepository.GetByIdAsync(campaignId).Returns(campaign);

        // Act
        var result = await _handler.HandleAsync(campaignId, request, userId);

        // Assert
        if (scenario == "UpdateCampaignCommandHandler updates campaign successfully")
        {
            result.Name.Should().Be("Updated Campaign");
            result.FantasyType.Should().Be("Dark Fantasy");
        }
        else if (scenario == "UpdateCampaignCommandHandler returns updated campaign")
        {
            result.Should().NotBeNull();
            result.Id.Should().Be(campaignId);
        }
    }

    [TestCase("UpdateCampaignCommandHandler returns null when campaign not found")]
    public async Task HandleAsync_ReturnsNullWhenCampaignNotFound(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var request = new UpdateCampaignRequest { Name = "Test" };

        _campaignReadRepository.GetByIdAsync(campaignId).Returns((CampaignDomain)null);

        // Act
        var result = await _handler.HandleAsync(campaignId, request, userId);

        // Assert
        result.Should().BeNull();
    }

    [TestCase("UpdateCampaignCommandHandler returns null when user not campaign owner")]
    public async Task HandleAsync_ReturnsNullWhenUserNotOwner(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var differentUserId = Guid.NewGuid();
        var request = new UpdateCampaignRequest { Name = "Test" };

        var campaign = new CampaignDomain
        {
            Id = campaignId,
            DmUserId = differentUserId,
            Name = "Test Campaign"
        };

        _campaignReadRepository.GetByIdAsync(campaignId).Returns(campaign);

        // Act
        var result = await _handler.HandleAsync(campaignId, request, userId);

        // Assert
        result.Should().BeNull();
        await _campaignUpdateRepository.DidNotReceive().UpdateAsync(Arg.Any<CampaignDomain>());
    }

    [TestCase("UpdateCampaignCommandHandler updates all properties")]
    public async Task HandleAsync_UpdatesAllProperties(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var request = new UpdateCampaignRequest
        {
            Name = "New Name",
            FantasyType = "Sci-Fi",
            Description = "New Description",
            SpineColor = "#ABCDEF"
        };

        var campaign = new CampaignDomain
        {
            Id = campaignId,
            DmUserId = userId,
            Name = "Old Name",
            FantasyType = "Fantasy",
            Description = "Old Description",
            SpineColor = "#000000"
        };

        _campaignReadRepository.GetByIdAsync(campaignId).Returns(campaign);

        // Act
        var result = await _handler.HandleAsync(campaignId, request, userId);

        // Assert
        result.Name.Should().Be("New Name");
        result.FantasyType.Should().Be("Sci-Fi");
        result.Description.Should().Be("New Description");
        result.SpineColor.Should().Be("#ABCDEF");
    }

    [TestCase("UpdateCampaignCommandHandler skips empty spine color")]
    public async Task HandleAsync_SkipsEmptySpineColor(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var originalColor = "#FF0000";

        var request = new UpdateCampaignRequest
        {
            Name = "New Name",
            FantasyType = "Fantasy",
            Description = "Description",
            SpineColor = ""
        };

        var campaign = new CampaignDomain
        {
            Id = campaignId,
            DmUserId = userId,
            Name = "Old Name",
            FantasyType = "Fantasy",
            Description = "Description",
            SpineColor = originalColor
        };

        _campaignReadRepository.GetByIdAsync(campaignId).Returns(campaign);

        // Act
        var result = await _handler.HandleAsync(campaignId, request, userId);

        // Assert
        result.SpineColor.Should().Be(originalColor);
    }

    [TestCase("UpdateCampaignCommandHandler calls repository update")]
    public async Task HandleAsync_CallsRepositoryUpdate(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var request = new UpdateCampaignRequest { Name = "Updated" };

        var campaign = new CampaignDomain
        {
            Id = campaignId,
            DmUserId = userId,
            Name = "Old Name"
        };

        _campaignReadRepository.GetByIdAsync(campaignId).Returns(campaign);

        // Act
        await _handler.HandleAsync(campaignId, request, userId);

        // Assert
        await _campaignUpdateRepository.Received(1).UpdateAsync(Arg.Is<CampaignDomain>(
            x => x.Id == campaignId && x.Name == "Updated"));
    }
}
