using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Repository.Repositories;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Campaign;

[TestFixture]
public class UpdateCastRelationshipCommandHandlerTests
{
    private ICampaignCastRelationshipRepository _repository;
    private UpdateCastRelationshipCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _repository = Substitute.For<ICampaignCastRelationshipRepository>();
        _handler = new UpdateCastRelationshipCommandHandler(_repository);
    }

    [TestCase("UpdateCastRelationshipCommandHandler updates relationship successfully")]
    [TestCase("UpdateCastRelationshipCommandHandler returns updated relationship")]
    public async Task HandleAsync_WhenRelationshipFound(string scenario)
    {
        // Arrange
        var relationshipId = Guid.NewGuid();
        var request = new UpdateCastRelationshipRequest
        {
            Value = 50,
            Explanation = "New Explanation"
        };

        var existing = new CampaignCastRelationshipDomain
        {
            Id = relationshipId,
            Value = 25,
            Explanation = "Old Explanation",
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };

        _repository.GetByIdAsync(relationshipId).Returns(existing);

        // Act
        var result = await _handler.HandleAsync(relationshipId, request);

        // Assert
        if (scenario == "UpdateCastRelationshipCommandHandler updates relationship successfully")
        {
            result.Value.Should().Be(50);
            result.Explanation.Should().Be("New Explanation");
        }
        else if (scenario == "UpdateCastRelationshipCommandHandler returns updated relationship")
        {
            result.Should().NotBeNull();
            result.Id.Should().Be(relationshipId);
        }
    }

    [TestCase("UpdateCastRelationshipCommandHandler returns null when relationship not found")]
    public async Task HandleAsync_ReturnsNullWhenNotFound(string scenario)
    {
        // Arrange
        var relationshipId = Guid.NewGuid();
        var request = new UpdateCastRelationshipRequest { Value = 100, Explanation = "Test" };

        _repository.GetByIdAsync(relationshipId).Returns((CampaignCastRelationshipDomain)null);

        // Act
        var result = await _handler.HandleAsync(relationshipId, request);

        // Assert
        result.Should().BeNull();
        await _repository.DidNotReceive().UpdateAsync(Arg.Any<CampaignCastRelationshipDomain>());
    }

    [TestCase("UpdateCastRelationshipCommandHandler updates timestamp")]
    public async Task HandleAsync_UpdatesTimestamp(string scenario)
    {
        // Arrange
        var relationshipId = Guid.NewGuid();
        var before = DateTime.UtcNow;
        var request = new UpdateCastRelationshipRequest { Value = 75, Explanation = "Test" };

        var existing = new CampaignCastRelationshipDomain
        {
            Id = relationshipId,
            Value = 25,
            Explanation = "Old",
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };

        _repository.GetByIdAsync(relationshipId).Returns(existing);

        // Act
        var result = await _handler.HandleAsync(relationshipId, request);

        // Assert
        result.UpdatedAt.Should().BeCloseTo(before, TimeSpan.FromSeconds(1));
    }

    [TestCase("UpdateCastRelationshipCommandHandler calls repository update")]
    public async Task HandleAsync_CallsRepositoryUpdate(string scenario)
    {
        // Arrange
        var relationshipId = Guid.NewGuid();
        var request = new UpdateCastRelationshipRequest { Value = 60, Explanation = "Updated" };

        var existing = new CampaignCastRelationshipDomain
        {
            Id = relationshipId,
            Value = 30,
            Explanation = "Old"
        };

        _repository.GetByIdAsync(relationshipId).Returns(existing);

        // Act
        await _handler.HandleAsync(relationshipId, request);

        // Assert
        await _repository.Received(1).UpdateAsync(
            Arg.Is<CampaignCastRelationshipDomain>(x =>
                x.Id == relationshipId &&
                x.Value == 60 &&
                x.Explanation == "Updated"));
    }
}
