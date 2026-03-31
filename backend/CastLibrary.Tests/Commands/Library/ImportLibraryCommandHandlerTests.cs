using CastLibrary.Logic.Commands.Library;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.Library;

[TestFixture]
public class ImportLibraryCommandHandlerTests
{
    private ICastRepository _castRepository;
    private ICityRepository _cityRepository;
    private ILocationRepository _locationRepository;
    private IImageStorageOperator _imageStorage;
    private IImageKeyCreator _imageKeyCreator;
    private ImportLibraryCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _castRepository = Substitute.For<ICastRepository>();
        _cityRepository = Substitute.For<ICityRepository>();
        _locationRepository = Substitute.For<ILocationRepository>();
        _imageStorage = Substitute.For<IImageStorageOperator>();
        _imageKeyCreator = Substitute.For<IImageKeyCreator>();

        _handler = new ImportLibraryCommandHandler(
            _castRepository,
            _cityRepository,
            _locationRepository,
            _imageStorage,
            _imageKeyCreator);
    }

    [TestCase("ImportLibraryCommandHandler handles empty bundle")]
    public async Task HandleAsync_HandlesEmptyBundle(string scenario)
    {
        // Arrange
        var dmUserId = Guid.NewGuid();
        var bundle = new LibraryBundle
        {
            Casts = [],
            Cities = [],
            Locations = []
        };

        _castRepository.GetAllByDmAsync(dmUserId).Returns([]);
        _cityRepository.GetAllByDmAsync(dmUserId).Returns([]);
        _locationRepository.GetAllByDmAsync(dmUserId).Returns([]);

        // Act
        var result = await _handler.HandleAsync(bundle, new Dictionary<string, Stream>(), dmUserId);

        // Assert
        result.Should().NotBeNull();
        result.CastsImported.Should().Be(0);
        result.CitiesImported.Should().Be(0);
        result.LocationsImported.Should().Be(0);
    }

    [TestCase("ImportLibraryCommandHandler returns import response")]
    public async Task HandleAsync_ReturnsImportResponse(string scenario)
    {
        // Arrange
        var dmUserId = Guid.NewGuid();
        var bundle = new LibraryBundle { Casts = [], Cities = [], Locations = [] };

        _castRepository.GetAllByDmAsync(dmUserId).Returns([]);
        _cityRepository.GetAllByDmAsync(dmUserId).Returns([]);
        _locationRepository.GetAllByDmAsync(dmUserId).Returns([]);

        // Act
        var result = await _handler.HandleAsync(bundle, new Dictionary<string, Stream>(), dmUserId);

        // Assert
        result.Should().BeOfType<ImportLibraryResponse>();
    }

    [TestCase("ImportLibraryCommandHandler verifies repository calls")]
    public async Task HandleAsync_VerifiesRepositoryCalls(string scenario)
    {
        // Arrange
        var dmUserId = Guid.NewGuid();
        var bundle = new LibraryBundle { Casts = [], Cities = [], Locations = [] };

        _castRepository.GetAllByDmAsync(dmUserId).Returns([]);
        _cityRepository.GetAllByDmAsync(dmUserId).Returns([]);
        _locationRepository.GetAllByDmAsync(dmUserId).Returns([]);

        // Act
        await _handler.HandleAsync(bundle, new Dictionary<string, Stream>(), dmUserId);

        // Assert
        await _castRepository.Received(1).GetAllByDmAsync(dmUserId);
        await _cityRepository.Received(1).GetAllByDmAsync(dmUserId);
        await _locationRepository.Received(1).GetAllByDmAsync(dmUserId);
    }
}
