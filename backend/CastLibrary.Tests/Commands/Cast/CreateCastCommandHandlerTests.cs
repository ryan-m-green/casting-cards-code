using CastLibrary.Logic.Commands.Cast;
using CastLibrary.Logic.Factories;
using CastLibrary.Repository.Repositories;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Cast;

[TestFixture]
public class CreateCastCommandHandlerTests
{
    private ICastRepository _castRepository;
    private ICastFactory _castFactory;
    private CreateCastCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _castRepository = Substitute.For<ICastRepository>();
        _castFactory = Substitute.For<ICastFactory>();

        _handler = new CreateCastCommandHandler(_castRepository, _castFactory);
    }

    [TestCase("CreateCastCommandHandler creates cast successfully")]
    [TestCase("CreateCastCommandHandler returns created cast")]
    public async Task HandleAsync_WhenValidRequest(string scenario)
    {
        // Arrange
        var dmUserId = Guid.NewGuid();
        var castId = Guid.NewGuid();

        var request = new CreateCastRequest
        {
            Name = "Test Cast",
            Pronouns = "they/them",
            Race = "Elf",
            Role = "Wizard"
        };

        var cast = new CastDomain
        {
            Id = castId,
            DmUserId = dmUserId,
            Name = request.Name,
            Pronouns = request.Pronouns,
            Race = request.Race,
            Role = request.Role
        };

        _castFactory.Create(request, dmUserId).Returns(cast);
        _castRepository.InsertAsync(cast).Returns(cast);

        // Act
        var result = await _handler.HandleAsync(request, dmUserId);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(castId);
        result.DmUserId.Should().Be(dmUserId);
    }

    [TestCase("CreateCastCommandHandler calls factory and repository")]
    public async Task HandleAsync_CallsFactoryAndRepository(string scenario)
    {
        // Arrange
        var dmUserId = Guid.NewGuid();
        var request = new CreateCastRequest { Name = "Test" };

        var cast = new CastDomain { Id = Guid.NewGuid(), DmUserId = dmUserId };

        _castFactory.Create(request, dmUserId).Returns(cast);
        _castRepository.InsertAsync(cast).Returns(cast);

        // Act
        await _handler.HandleAsync(request, dmUserId);

        // Assert
        _castFactory.Received(1).Create(request, dmUserId);
        await _castRepository.Received(1).InsertAsync(cast);
    }

    [TestCase("CreateCastCommandHandler passes correct parameters to factory")]
    public async Task HandleAsync_PassesCorrectParametersToFactory(string scenario)
    {
        // Arrange
        var dmUserId = Guid.NewGuid();
        var request = new CreateCastRequest { Name = "Test Cast" };
        var cast = new CastDomain { Id = Guid.NewGuid(), DmUserId = dmUserId };

        _castFactory.Create(request, dmUserId).Returns(cast);
        _castRepository.InsertAsync(cast).Returns(cast);

        // Act
        await _handler.HandleAsync(request, dmUserId);

        // Assert
        _castFactory.Received(1).Create(
            Arg.Is<CreateCastRequest>(r => r.Name == "Test Cast"),
            Arg.Is<Guid>(id => id == dmUserId));
    }
}
