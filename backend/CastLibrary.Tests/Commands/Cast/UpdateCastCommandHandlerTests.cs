using CastLibrary.Logic.Commands.Cast;
using CastLibrary.Repository.Repositories;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Cast;

[TestFixture]
public class UpdateCastCommandHandlerTests
{
    private ICastRepository _castRepository;
    private UpdateCastCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _castRepository = Substitute.For<ICastRepository>();
        _handler = new UpdateCastCommandHandler(_castRepository);
    }

    [TestCase("UpdateCastCommandHandler updates cast successfully")]
    [TestCase("UpdateCastCommandHandler returns updated cast")]
    public async Task HandleAsync_WhenValidRequest(string scenario)
    {
        // Arrange
        var castId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();

        var request = new CreateCastRequest
        {
            Name = "Updated Name",
            Pronouns = "he/him",
            Race = "Human",
            Role = "Barbarian",
            Age = "25",
            Alignment = "Chaotic Neutral",
            Posture = "Aggressive",
            Speed = "40 ft.",
            VoicePlacement = ["Chest"],
            Description = "Updated description",
            PublicDescription = "Updated public"
        };

        var existing = new CastDomain
        {
            Id = castId,
            DmUserId = dmUserId,
            Name = "Old Name",
            Pronouns = "they/them",
            Race = "Elf"
        };

        _castRepository.GetByIdAsync(castId).Returns(existing);
        _castRepository.UpdateAsync(Arg.Any<CastDomain>()).Returns(x => x.ArgAt<CastDomain>(0));

        // Act
        var result = await _handler.HandleAsync(castId, request, dmUserId);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(castId);
    }

    [TestCase("UpdateCastCommandHandler returns null when cast not found")]
    public async Task HandleAsync_ReturnsNullWhenCastNotFound(string scenario)
    {
        // Arrange
        var castId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new CreateCastRequest { Name = "Test" };

        _castRepository.GetByIdAsync(castId).Returns((CastDomain)null);

        // Act
        var result = await _handler.HandleAsync(castId, request, dmUserId);

        // Assert
        result.Should().BeNull();
        await _castRepository.DidNotReceive().UpdateAsync(Arg.Any<CastDomain>());
    }

    [TestCase("UpdateCastCommandHandler returns null when user not owner")]
    public async Task HandleAsync_ReturnsNullWhenUserNotOwner(string scenario)
    {
        // Arrange
        var castId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var differentUserId = Guid.NewGuid();
        var request = new CreateCastRequest { Name = "Test" };

        var existing = new CastDomain { Id = castId, DmUserId = differentUserId };

        _castRepository.GetByIdAsync(castId).Returns(existing);

        // Act
        var result = await _handler.HandleAsync(castId, request, dmUserId);

        // Assert
        result.Should().BeNull();
        await _castRepository.DidNotReceive().UpdateAsync(Arg.Any<CastDomain>());
    }

    [TestCase("UpdateCastCommandHandler updates all properties")]
    public async Task HandleAsync_UpdatesAllProperties(string scenario)
    {
        // Arrange
        var castId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();

        var request = new CreateCastRequest
        {
            Name = "New Name",
            Pronouns = "she/her",
            Race = "Dwarf",
            Role = "Rogue",
            Age = "150",
            Alignment = "Neutral Good",
            Posture = "Sneaky",
            Speed = "25 ft.",
            VoicePlacement = ["Nasal"],
            Description = "New description",
            PublicDescription = "New public"
        };

        var existing = new CastDomain { Id = castId, DmUserId = dmUserId };

        _castRepository.GetByIdAsync(castId).Returns(existing);
        _castRepository.UpdateAsync(Arg.Any<CastDomain>()).Returns(x => x.ArgAt<CastDomain>(0));

        // Act
        var result = await _handler.HandleAsync(castId, request, dmUserId);

        // Assert
        result.Name.Should().Be("New Name");
        result.Pronouns.Should().Be("she/her");
        result.Race.Should().Be("Dwarf");
        result.Role.Should().Be("Rogue");
        result.Age.Should().Be("150");
    }

    [TestCase("UpdateCastCommandHandler calls repository update")]
    public async Task HandleAsync_CallsRepositoryUpdate(string scenario)
    {
        // Arrange
        var castId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new CreateCastRequest { Name = "Updated" };

        var existing = new CastDomain { Id = castId, DmUserId = dmUserId };

        _castRepository.GetByIdAsync(castId).Returns(existing);
        _castRepository.UpdateAsync(Arg.Any<CastDomain>()).Returns(x => x.ArgAt<CastDomain>(0));

        // Act
        await _handler.HandleAsync(castId, request, dmUserId);

        // Assert
        await _castRepository.Received(1).UpdateAsync(
            Arg.Is<CastDomain>(c => c.Id == castId && c.Name == "Updated"));
    }
}
