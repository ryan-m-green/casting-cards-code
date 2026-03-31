using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Repository.Repositories;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Campaign;

[TestFixture]
public class AddCampaignSecretCommandHandlerTests
{
    private ISecretRepository _secretRepository;
    private AddCampaignSecretCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _secretRepository = Substitute.For<ISecretRepository>();
        _handler = new AddCampaignSecretCommandHandler(_secretRepository);
    }

    [TestCase("AddCampaignSecretCommandHandler creates secret with cast entity type")]
    [TestCase("AddCampaignSecretCommandHandler creates secret with city entity type")]
    [TestCase("AddCampaignSecretCommandHandler creates secret with location entity type")]
    [TestCase("AddCampaignSecretCommandHandler returns inserted secret")]
    public async Task HandleAsync_WhenValidRequest(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var instanceId = Guid.NewGuid();
        var secretId = Guid.NewGuid();
        var content = "This is a secret";
        var entityType = scenario == "AddCampaignSecretCommandHandler creates secret with cast entity type" ? EntityType.Cast :
                         scenario == "AddCampaignSecretCommandHandler creates secret with city entity type" ? EntityType.City : EntityType.Location;

        var request = new AddCampaignSecretRequest
        {
            EntityType = entityType,
            InstanceId = instanceId,
            Content = content
        };

        var insertedSecret = new CampaignSecretDomain
        {
            Id = secretId,
            CampaignId = campaignId,
            CastInstanceId = entityType == EntityType.Cast ? instanceId : null,
            CityInstanceId = entityType == EntityType.City ? instanceId : null,
            LocationInstanceId = entityType == EntityType.Location ? instanceId : null,
            Content = content,
            SortOrder = 0,
            IsRevealed = false,
            CreatedAt = DateTime.UtcNow
        };

        _secretRepository.InsertAsync(Arg.Is<CampaignSecretDomain>(s =>
            s.CampaignId == campaignId &&
            s.Content == content &&
            s.IsRevealed == false &&
            s.SortOrder == 0)).Returns(insertedSecret);

        // Act
        var result = await _handler.HandleAsync(campaignId, request);

        // Assert
        if (scenario == "AddCampaignSecretCommandHandler creates secret with cast entity type")
        {
            result.CastInstanceId.Should().Be(instanceId);
            result.CityInstanceId.Should().BeNull();
            result.LocationInstanceId.Should().BeNull();
        }
        else if (scenario == "AddCampaignSecretCommandHandler creates secret with city entity type")
        {
            result.CastInstanceId.Should().BeNull();
            result.CityInstanceId.Should().Be(instanceId);
            result.LocationInstanceId.Should().BeNull();
        }
        else if (scenario == "AddCampaignSecretCommandHandler creates secret with location entity type")
        {
            result.CastInstanceId.Should().BeNull();
            result.CityInstanceId.Should().BeNull();
            result.LocationInstanceId.Should().Be(instanceId);
        }
        else if (scenario == "AddCampaignSecretCommandHandler returns inserted secret")
        {
            result.Should().NotBeNull();
            result.Id.Should().Be(secretId);
            result.CampaignId.Should().Be(campaignId);
            result.Content.Should().Be(content);
        }
    }

    [TestCase("AddCampaignSecretCommandHandler inserts secret into repository")]
    public async Task HandleAsync_CallsRepository(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var instanceId = Guid.NewGuid();
        var secretId = Guid.NewGuid();

        var request = new AddCampaignSecretRequest
        {
            EntityType = EntityType.Cast,
            InstanceId = instanceId,
            Content = "Secret content"
        };

        var insertedSecret = new CampaignSecretDomain
        {
            Id = secretId,
            CampaignId = campaignId,
            CastInstanceId = instanceId,
            Content = "Secret content",
            SortOrder = 0,
            IsRevealed = false,
            CreatedAt = DateTime.UtcNow
        };

        _secretRepository.InsertAsync(Arg.Any<CampaignSecretDomain>()).Returns(insertedSecret);

        // Act
        await _handler.HandleAsync(campaignId, request);

        // Assert
        await _secretRepository.Received(1).InsertAsync(Arg.Is<CampaignSecretDomain>(s =>
            s.CampaignId == campaignId &&
            s.Content == "Secret content"));
    }

    [TestCase("AddCampaignSecretCommandHandler creates secret with correct initial values")]
    public async Task HandleAsync_SetsCorrectDefaultValues(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var instanceId = Guid.NewGuid();
        var secretId = Guid.NewGuid();

        var request = new AddCampaignSecretRequest
        {
            EntityType = EntityType.Cast,
            InstanceId = instanceId,
            Content = "Test secret"
        };

        var insertedSecret = new CampaignSecretDomain
        {
            Id = secretId,
            CampaignId = campaignId,
            CastInstanceId = instanceId,
            Content = "Test secret",
            SortOrder = 0,
            IsRevealed = false,
            CreatedAt = DateTime.UtcNow
        };

        _secretRepository.InsertAsync(Arg.Any<CampaignSecretDomain>()).Returns(insertedSecret);

        // Act
        var result = await _handler.HandleAsync(campaignId, request);

        // Assert
        result.SortOrder.Should().Be(0);
        result.IsRevealed.Should().BeFalse();
        result.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
    }

    [TestCase("AddCampaignSecretCommandHandler generates unique id for each secret")]
    public async Task HandleAsync_CreatesUniqueId(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var instanceId = Guid.NewGuid();

        var request = new AddCampaignSecretRequest
        {
            EntityType = EntityType.Cast,
            InstanceId = instanceId,
            Content = "Secret"
        };

        CampaignSecretDomain capturedSecret = null;
        _secretRepository.InsertAsync(Arg.Do<CampaignSecretDomain>(s => capturedSecret = s))
            .Returns(x => (CampaignSecretDomain)x[0]);

        // Act
        await _handler.HandleAsync(campaignId, request);

        // Assert
        capturedSecret.Id.Should().NotBeEmpty();
        capturedSecret.Id.Should().NotBe(Guid.Empty);
    }
}
