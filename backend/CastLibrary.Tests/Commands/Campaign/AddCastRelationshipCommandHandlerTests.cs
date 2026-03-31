using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Repository.Repositories;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Campaign;

[TestFixture]
public class AddCastRelationshipCommandHandlerTests
{
    private ICampaignCastRelationshipRepository _repository;
    private AddCastRelationshipCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _repository = Substitute.For<ICampaignCastRelationshipRepository>();
        _handler = new AddCastRelationshipCommandHandler(_repository);
    }

    [TestCase("AddCastRelationshipCommandHandler creates relationship with correct values")]
    [TestCase("AddCastRelationshipCommandHandler returns inserted relationship")]
    public async Task HandleAsync_WhenValidRequest(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var sourceInstanceId = Guid.NewGuid();
        var targetInstanceId = Guid.NewGuid();
        var relationshipId = Guid.NewGuid();
        var value = 5;
        var explanation = "They are allies";

        var request = new AddCastRelationshipRequest
        {
            SourceCastInstanceId = sourceInstanceId,
            TargetCastInstanceId = targetInstanceId,
            Value = value,
            Explanation = explanation
        };

        var insertedRelationship = new CampaignCastRelationshipDomain
        {
            Id = relationshipId,
            CampaignId = campaignId,
            SourceCastInstanceId = sourceInstanceId,
            TargetCastInstanceId = targetInstanceId,
            Value = value,
            Explanation = explanation,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _repository.InsertAsync(Arg.Is<CampaignCastRelationshipDomain>(r =>
            r.CampaignId == campaignId &&
            r.SourceCastInstanceId == sourceInstanceId &&
            r.TargetCastInstanceId == targetInstanceId &&
            r.Value == value &&
            r.Explanation == explanation)).Returns(insertedRelationship);

        // Act
        var result = await _handler.HandleAsync(campaignId, request);

        // Assert
        if (scenario == "AddCastRelationshipCommandHandler creates relationship with correct values")
        {
            result.SourceCastInstanceId.Should().Be(sourceInstanceId);
            result.TargetCastInstanceId.Should().Be(targetInstanceId);
            result.Value.Should().Be(value);
            result.Explanation.Should().Be(explanation);
        }
        else if (scenario == "AddCastRelationshipCommandHandler returns inserted relationship")
        {
            result.Should().NotBeNull();
            result.Id.Should().Be(relationshipId);
            result.CampaignId.Should().Be(campaignId);
        }
    }

    [TestCase("AddCastRelationshipCommandHandler inserts relationship into repository")]
    public async Task HandleAsync_CallsRepository(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var sourceInstanceId = Guid.NewGuid();
        var targetInstanceId = Guid.NewGuid();
        var relationshipId = Guid.NewGuid();

        var request = new AddCastRelationshipRequest
        {
            SourceCastInstanceId = sourceInstanceId,
            TargetCastInstanceId = targetInstanceId,
            Value = 3,
            Explanation = "Friends"
        };

        var insertedRelationship = new CampaignCastRelationshipDomain
        {
            Id = relationshipId,
            CampaignId = campaignId,
            SourceCastInstanceId = sourceInstanceId,
            TargetCastInstanceId = targetInstanceId,
            Value = 3,
            Explanation = "Friends",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _repository.InsertAsync(Arg.Any<CampaignCastRelationshipDomain>()).Returns(insertedRelationship);

        // Act
        await _handler.HandleAsync(campaignId, request);

        // Assert
        await _repository.Received(1).InsertAsync(Arg.Is<CampaignCastRelationshipDomain>(r =>
            r.CampaignId == campaignId));
    }

    [TestCase("AddCastRelationshipCommandHandler sets timestamps correctly")]
    public async Task HandleAsync_SetsTimestamps(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var request = new AddCastRelationshipRequest
        {
            SourceCastInstanceId = Guid.NewGuid(),
            TargetCastInstanceId = Guid.NewGuid(),
            Value = 1,
            Explanation = "Neutral"
        };

        CampaignCastRelationshipDomain capturedRelationship = null;
        _repository.InsertAsync(Arg.Do<CampaignCastRelationshipDomain>(r => capturedRelationship = r))
            .Returns(x => (CampaignCastRelationshipDomain)x[0]);

        // Act
        await _handler.HandleAsync(campaignId, request);

        // Assert
        capturedRelationship.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        capturedRelationship.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        capturedRelationship.CreatedAt.Should().BeCloseTo(capturedRelationship.UpdatedAt, TimeSpan.FromMilliseconds(10));
    }

    [TestCase("AddCastRelationshipCommandHandler generates unique id")]
    public async Task HandleAsync_CreatesUniqueId(string scenario)
    {
        // Arrange
        var campaignId = Guid.NewGuid();
        var request = new AddCastRelationshipRequest
        {
            SourceCastInstanceId = Guid.NewGuid(),
            TargetCastInstanceId = Guid.NewGuid(),
            Value = 0,
            Explanation = ""
        };

        CampaignCastRelationshipDomain capturedRelationship = null;
        _repository.InsertAsync(Arg.Do<CampaignCastRelationshipDomain>(r => capturedRelationship = r))
            .Returns(x => (CampaignCastRelationshipDomain)x[0]);

        // Act
        await _handler.HandleAsync(campaignId, request);

        // Assert
        capturedRelationship.Id.Should().NotBeEmpty();
        capturedRelationship.Id.Should().NotBe(Guid.Empty);
    }
}
