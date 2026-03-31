using CastLibrary.Logic.Factories;
using CastLibrary.Shared.Domain;
using FluentAssertions;
using NUnit.Framework;

namespace CastLibrary.Tests.Factories;

[TestFixture]
public class LocationInstanceFactoryTests
{
    private LocationInstanceFactory _factory;

    [SetUp]
    public void Setup()
    {
        _factory = new LocationInstanceFactory();
    }

    [TestCaseSource(typeof(LocationInstanceFactoryTestDataSource), "TestCases")]
    public void Create_CreatesCorrectLocationInstance(LocationInstanceFactoryScenarioAndExpected testCase)
    {
        // Arrange
        var source = testCase.SourceLocation;
        var campaignId = testCase.CampaignId;
        var cityInstanceId = testCase.CityInstanceId;

        // Act
        var result = _factory.Create(source, campaignId, cityInstanceId);

        // Assert
        result.InstanceId.Should().NotBeEmpty();
        result.CampaignId.Should().Be(testCase.Expected.CampaignId);
        result.SourceLocationId.Should().Be(testCase.Expected.SourceLocationId);
        result.CityInstanceId.Should().Be(testCase.Expected.CityInstanceId);
        result.Name.Should().Be(testCase.Expected.Name);
        result.Description.Should().Be(testCase.Expected.Description);
        result.ShopItems.Should().HaveCount(testCase.Expected.ShopItems.Count);
        result.ShopItems.Should().AllSatisfy(item =>
        {
            item.Id.Should().NotBeEmpty();
            item.LocationId.Should().Be(result.InstanceId);
        });
    }

    private class LocationInstanceFactoryTestDataSource
    {
        public static IEnumerable<TestCaseData> TestCases()
        {
            var campaignId = Guid.NewGuid();
            var cityInstanceId = Guid.NewGuid();

            var sourceLocation = new LocationDomain
            {
                Id = Guid.NewGuid(),
                Name = "The Broken Wheel Inn",
                Description = "A cozy tavern in the heart of town",
                ShopItems = new List<ShopItemDomain>
                {
                    new() { Name = "Ale", Price = "5", Description = "Cheap ale", SortOrder = 1 },
                    new() { Name = "Wine", Price = "10", Description = "Fine wine", SortOrder = 2 }
                }
            };

            yield return new TestCaseData(new LocationInstanceFactoryScenarioAndExpected
            {
                Scenario = "Create location instance with all associations",
                SourceLocation = sourceLocation,
                CampaignId = campaignId,
                CityInstanceId = cityInstanceId,
                Expected = new CampaignLocationInstanceDomain
                {
                    CampaignId = campaignId,
                    SourceLocationId = sourceLocation.Id,
                    CityInstanceId = cityInstanceId,
                    Name = "The Broken Wheel Inn",
                    Description = "A cozy tavern in the heart of town",
                    ShopItems = new List<ShopItemDomain>
                    {
                        new() { Name = "Ale", Price = "5", Description = "Cheap ale", SortOrder = 1 },
                        new() { Name = "Wine", Price = "10", Description = "Fine wine", SortOrder = 2 }
                    }
                }
            }).SetName("LocationInstanceFactory creates correct location instance with all associations");

            yield return new TestCaseData(new LocationInstanceFactoryScenarioAndExpected
            {
                Scenario = "Create location instance without city instance",
                SourceLocation = sourceLocation,
                CampaignId = campaignId,
                CityInstanceId = null,
                Expected = new CampaignLocationInstanceDomain
                {
                    CampaignId = campaignId,
                    SourceLocationId = sourceLocation.Id,
                    CityInstanceId = null,
                    Name = "The Broken Wheel Inn",
                    Description = "A cozy tavern in the heart of town",
                    ShopItems = new List<ShopItemDomain>
                    {
                        new() { Name = "Ale", Price = "5", Description = "Cheap ale", SortOrder = 1 },
                        new() { Name = "Wine", Price = "10", Description = "Fine wine", SortOrder = 2 }
                    }
                }
            }).SetName("LocationInstanceFactory creates correct location instance without city instance");

            var emptyLocation = new LocationDomain
            {
                Id = Guid.NewGuid(),
                Name = "Empty Warehouse",
                Description = "An abandoned warehouse",
                ShopItems = new List<ShopItemDomain>()
            };

            yield return new TestCaseData(new LocationInstanceFactoryScenarioAndExpected
            {
                Scenario = "Create location instance with no shop items",
                SourceLocation = emptyLocation,
                CampaignId = campaignId,
                CityInstanceId = cityInstanceId,
                Expected = new CampaignLocationInstanceDomain
                {
                    CampaignId = campaignId,
                    SourceLocationId = emptyLocation.Id,
                    CityInstanceId = cityInstanceId,
                    Name = "Empty Warehouse",
                    Description = "An abandoned warehouse",
                    ShopItems = new List<ShopItemDomain>()
                }
            }).SetName("LocationInstanceFactory creates correct location instance with no shop items");
        }
    }

    public class LocationInstanceFactoryScenarioAndExpected
    {
        public string Scenario { get; set; }
        public LocationDomain SourceLocation { get; set; }
        public Guid CampaignId { get; set; }
        public Guid? CityInstanceId { get; set; }
        public CampaignLocationInstanceDomain Expected { get; set; }
    }
}
