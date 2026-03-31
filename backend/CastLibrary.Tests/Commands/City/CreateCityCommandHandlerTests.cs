using CastLibrary.Logic.Commands.City;
using CastLibrary.Repository.Repositories;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using FluentAssertions;
using NSubstitute;
using NUnit.Framework;

namespace CastLibrary.Tests.Commands.City;

[TestFixture]
public class CreateCityCommandHandlerTests
{
    private ICityRepository _cityRepository;
    private CreateCityCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _cityRepository = Substitute.For<ICityRepository>();
        _handler = new CreateCityCommandHandler(_cityRepository);
    }

    [TestCase("CreateCityCommandHandler creates city successfully")]
    [TestCase("CreateCityCommandHandler returns created city")]
    public async Task HandleAsync_WhenValidRequest(string scenario)
    {
        // Arrange
        var dmUserId = Guid.NewGuid();

        var request = new CreateCityRequest
        {
            Name = "Test City",
            Classification = "Capital",
            Size = "Large",
            Condition = "Prosperous",
            Geography = "Coastal"
        };

        var insertedCity = new CityDomain
        {
            Name = request.Name,
            DmUserId = dmUserId,
            Classification = request.Classification
        };

        _cityRepository.InsertAsync(Arg.Any<CityDomain>()).Returns(insertedCity);

        // Act
        var result = await _handler.HandleAsync(request, dmUserId);

        // Assert
        result.Should().NotBeNull();
        result.DmUserId.Should().Be(dmUserId);
        result.Name.Should().Be("Test City");
    }

    [TestCase("CreateCityCommandHandler creates city with all properties")]
    public async Task HandleAsync_CreatesWithAllProperties(string scenario)
    {
        // Arrange
        var dmUserId = Guid.NewGuid();

        var request = new CreateCityRequest
        {
            Name = "Test City",
            Classification = "Capital",
            Size = "Large",
            Condition = "Prosperous",
            Geography = "Coastal",
            Architecture = "Gothic",
            Climate = "Temperate",
            Religion = "Polytheistic",
            Vibe = "Welcoming",
            Languages = "Common",
            Description = "A beautiful city"
        };

        var insertedCity = new CityDomain();

        _cityRepository.InsertAsync(Arg.Any<CityDomain>()).Returns(x => x.ArgAt<CityDomain>(0));

        // Act
        var result = await _handler.HandleAsync(request, dmUserId);

        // Assert
        result.Name.Should().Be("Test City");
        result.Classification.Should().Be("Capital");
        result.Size.Should().Be("Large");
        result.Description.Should().Be("A beautiful city");
    }

    [TestCase("CreateCityCommandHandler sets created at timestamp")]
    public async Task HandleAsync_SetsCreatedAtTimestamp(string scenario)
    {
        // Arrange
        var dmUserId = Guid.NewGuid();
        var before = DateTime.UtcNow;
        var request = new CreateCityRequest { Name = "Test" };

        _cityRepository.InsertAsync(Arg.Any<CityDomain>()).Returns(x => x.ArgAt<CityDomain>(0));

        // Act
        var result = await _handler.HandleAsync(request, dmUserId);

        // Assert
        result.CreatedAt.Should().BeCloseTo(before, TimeSpan.FromSeconds(1));
    }

    [TestCase("CreateCityCommandHandler calls repository insert")]
    public async Task HandleAsync_CallsRepositoryInsert(string scenario)
    {
        // Arrange
        var dmUserId = Guid.NewGuid();
        var request = new CreateCityRequest { Name = "Test City" };

        _cityRepository.InsertAsync(Arg.Any<CityDomain>()).Returns(x => x.ArgAt<CityDomain>(0));

        // Act
        await _handler.HandleAsync(request, dmUserId);

        // Assert
        await _cityRepository.Received(1).InsertAsync(
            Arg.Is<CityDomain>(c =>
                c.DmUserId == dmUserId &&
                c.Name == "Test City"));
    }
}
