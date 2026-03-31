using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Repository.Repositories;
using CastLibrary.Shared.Domain;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Campaign;

[TestFixture]
public class DeleteCastRelationshipCommandHandlerTests
{
    private ICampaignCastRelationshipRepository _repository;
    private DeleteCastRelationshipCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _repository = Substitute.For<ICampaignCastRelationshipRepository>();
        _handler = new DeleteCastRelationshipCommandHandler(_repository);
    }

    [TestCase("DeleteCastRelationshipCommandHandler deletes relationship when found")]
    public async Task HandleAsync_DeletesRelationshipWhenFound(string scenario)
    {
        // Arrange
        var relationshipId = Guid.NewGuid();
        var existing = new CampaignCastRelationshipDomain
        {
            Id = relationshipId,
            SourceCastInstanceId = Guid.NewGuid(),
            TargetCastInstanceId = Guid.NewGuid()
        };

        _repository.GetByIdAsync(relationshipId).Returns(existing);

        // Act
        var result = await _handler.HandleAsync(relationshipId);

        // Assert
        result.Should().BeTrue();
        await _repository.Received(1).DeleteAsync(relationshipId);
    }

    [TestCase("DeleteCastRelationshipCommandHandler returns false when not found")]
    public async Task HandleAsync_ReturnsFalseWhenNotFound(string scenario)
    {
        // Arrange
        var relationshipId = Guid.NewGuid();

        _repository.GetByIdAsync(relationshipId).Returns((CampaignCastRelationshipDomain)null);

        // Act
        var result = await _handler.HandleAsync(relationshipId);

        // Assert
        result.Should().BeFalse();
        await _repository.DidNotReceive().DeleteAsync(Arg.Any<Guid>());
    }

    [TestCase("DeleteCastRelationshipCommandHandler calls repository with correct id")]
    public async Task HandleAsync_CallsRepositoryWithCorrectId(string scenario)
    {
        // Arrange
        var relationshipId = Guid.NewGuid();
        var existing = new CampaignCastRelationshipDomain { Id = relationshipId };

        _repository.GetByIdAsync(relationshipId).Returns(existing);

        // Act
        await _handler.HandleAsync(relationshipId);

        // Assert
        await _repository.Received(1).DeleteAsync(Arg.Is<Guid>(x => x == relationshipId));
    }
}
