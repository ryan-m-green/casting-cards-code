using CastLibrary.Logic.Commands.City;
using CastLibrary.Repository.Repositories;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.City;

[TestFixture]
public class UpdateCityCommandHandlerTests
{
    private ICityRepository _cityRepository;
    private UpdateCityCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _cityRepository = Substitute.For<ICityRepository>();
        _handler = new UpdateCityCommandHandler(_cityRepository);
    }

    [TestCase("UpdateCityCommandHandler updates city successfully")]
    [TestCase("UpdateCityCommandHandler returns updated city")]
    public async Task HandleAsync_WhenValidRequest(string scenario)
    {
        // Arrange
        var cityId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();

        var request = new CreateCityRequest
        {
            Name = "Updated City",
            Classification = "Provincial",
            Size = "Medium"
        };

        var existing = new CityDomain
        {
            Id = cityId,
            DmUserId = dmUserId,
            Name = "Old City",
            Classification = "Capital"
        };

        _cityRepository.GetByIdAsync(cityId).Returns(existing);
        _cityRepository.UpdateAsync(Arg.Any<CityDomain>()).Returns(x => x.ArgAt<CityDomain>(0));

        // Act
        var result = await _handler.HandleAsync(cityId, request, dmUserId);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Updated City");
    }

    [TestCase("UpdateCityCommandHandler returns null when city not found")]
    public async Task HandleAsync_ReturnsNullWhenCityNotFound(string scenario)
    {
        // Arrange
        var cityId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new CreateCityRequest { Name = "Test" };

        _cityRepository.GetByIdAsync(cityId).Returns((CityDomain)null);

        // Act
        var result = await _handler.HandleAsync(cityId, request, dmUserId);

        // Assert
        result.Should().BeNull();
        await _cityRepository.DidNotReceive().UpdateAsync(Arg.Any<CityDomain>());
    }

    [TestCase("UpdateCityCommandHandler returns null when user not owner")]
    public async Task HandleAsync_ReturnsNullWhenUserNotOwner(string scenario)
    {
        // Arrange
        var cityId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var differentUserId = Guid.NewGuid();
        var request = new CreateCityRequest { Name = "Test" };

        var existing = new CityDomain { Id = cityId, DmUserId = differentUserId };

        _cityRepository.GetByIdAsync(cityId).Returns(existing);

        // Act
        var result = await _handler.HandleAsync(cityId, request, dmUserId);

        // Assert
        result.Should().BeNull();
        await _cityRepository.DidNotReceive().UpdateAsync(Arg.Any<CityDomain>());
    }

    [TestCase("UpdateCityCommandHandler updates all properties")]
    public async Task HandleAsync_UpdatesAllProperties(string scenario)
    {
        // Arrange
        var cityId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();

        var request = new CreateCityRequest
        {
            Name = "New Name",
            Classification = "New Class",
            Size = "New Size",
            Condition = "New Condition",
            Geography = "New Geography",
            Architecture = "New Architecture",
            Climate = "New Climate",
            Religion = "New Religion",
            Vibe = "New Vibe",
            Languages = "New Languages",
            Description = "New Description"
        };

        var existing = new CityDomain { Id = cityId, DmUserId = dmUserId };

        _cityRepository.GetByIdAsync(cityId).Returns(existing);
        _cityRepository.UpdateAsync(Arg.Any<CityDomain>()).Returns(x => x.ArgAt<CityDomain>(0));

        // Act
        var result = await _handler.HandleAsync(cityId, request, dmUserId);

        // Assert
        result.Name.Should().Be("New Name");
        result.Classification.Should().Be("New Class");
        result.Description.Should().Be("New Description");
    }

    [TestCase("UpdateCityCommandHandler calls repository update")]
    public async Task HandleAsync_CallsRepositoryUpdate(string scenario)
    {
        // Arrange
        var cityId = Guid.NewGuid();
        var dmUserId = Guid.NewGuid();
        var request = new CreateCityRequest { Name = "Updated" };

        var existing = new CityDomain { Id = cityId, DmUserId = dmUserId };

        _cityRepository.GetByIdAsync(cityId).Returns(existing);
        _cityRepository.UpdateAsync(Arg.Any<CityDomain>()).Returns(x => x.ArgAt<CityDomain>(0));

        // Act
        await _handler.HandleAsync(cityId, request, dmUserId);

        // Assert
        await _cityRepository.Received(1).UpdateAsync(
            Arg.Is<CityDomain>(c => c.Id == cityId && c.Name == "Updated"));
    }
}
