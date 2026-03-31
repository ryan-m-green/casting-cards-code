using CastLibrary.Logic.Factories;
using CastLibrary.Shared.Domain;
using FluentAssertions;
using NUnit.Framework;

namespace CastLibrary.Tests.Factories;

[TestFixture]
public class CityInstanceFactoryTests
{
    private CityInstanceFactory _factory;

    [SetUp]
    public void Setup()
    {
        _factory = new CityInstanceFactory();
    }

    [TestCaseSource(typeof(CityInstanceFactoryTestDataSource), "TestCases")]
    public void Create_CreatesCorrectCityInstance(CityInstanceFactoryScenarioAndExpected testCase)
    {
        // Arrange
        var source = testCase.SourceCity;
        var campaignId = testCase.CampaignId;
        var sortOrder = testCase.SortOrder;

        // Act
        var result = _factory.Create(source, campaignId, sortOrder);

        // Assert
        result.Should().BeEquivalentTo(testCase.Expected, options =>
            options.Excluding(x => x.InstanceId));
        result.InstanceId.Should().NotBeEmpty();
    }

    private class CityInstanceFactoryTestDataSource
    {
        public static IEnumerable<TestCaseData> TestCases()
        {
            var sourceCity = new CityDomain
            {
                Id = Guid.NewGuid(),
                Name = "Waterdeep",
                Classification = "Major City",
                Size = "Large",
                Condition = "Prosperous",
                Geography = "Coastal",
                Architecture = "Medieval",
                Climate = "Temperate",
                Religion = "Polytheistic",
                Vibe = "Bustling Trade Hub",
                Languages = "Common, Elvish",
                Description = "A major trading city"
            };

            var campaignId = Guid.NewGuid();

            yield return new TestCaseData(new CityInstanceFactoryScenarioAndExpected
            {
                Scenario = "Create city instance with all properties at sort order 1",
                SourceCity = sourceCity,
                CampaignId = campaignId,
                SortOrder = 1,
                Expected = new CampaignCityInstanceDomain
                {
                    CampaignId = campaignId,
                    SourceCityId = sourceCity.Id,
                    Name = "Waterdeep",
                    Classification = "Major City",
                    Size = "Large",
                    Condition = "Prosperous",
                    Geography = "Coastal",
                    Architecture = "Medieval",
                    Climate = "Temperate",
                    Religion = "Polytheistic",
                    Vibe = "Bustling Trade Hub",
                    Languages = "Common, Elvish",
                    Description = "A major trading city",
                    IsVisibleToPlayers = false,
                    SortOrder = 1
                }
            }).SetName("CityInstanceFactory creates correct city instance at sort order one");

            yield return new TestCaseData(new CityInstanceFactoryScenarioAndExpected
            {
                Scenario = "Create city instance at sort order 5",
                SourceCity = sourceCity,
                CampaignId = campaignId,
                SortOrder = 5,
                Expected = new CampaignCityInstanceDomain
                {
                    CampaignId = campaignId,
                    SourceCityId = sourceCity.Id,
                    Name = "Waterdeep",
                    Classification = "Major City",
                    Size = "Large",
                    Condition = "Prosperous",
                    Geography = "Coastal",
                    Architecture = "Medieval",
                    Climate = "Temperate",
                    Religion = "Polytheistic",
                    Vibe = "Bustling Trade Hub",
                    Languages = "Common, Elvish",
                    Description = "A major trading city",
                    IsVisibleToPlayers = false,
                    SortOrder = 5
                }
            }).SetName("CityInstanceFactory creates correct city instance at sort order five");

            var smallTown = new CityDomain
            {
                Id = Guid.NewGuid(),
                Name = "Phandalin",
                Classification = "Small Town",
                Size = "Small",
                Condition = "Recovering",
                Geography = "Inland",
                Architecture = "Simple",
                Climate = "Temperate",
                Religion = "Mixed",
                Vibe = "Rustic",
                Languages = "Common",
                Description = "A small rural town"
            };

            yield return new TestCaseData(new CityInstanceFactoryScenarioAndExpected
            {
                Scenario = "Create city instance from small town",
                SourceCity = smallTown,
                CampaignId = campaignId,
                SortOrder = 2,
                Expected = new CampaignCityInstanceDomain
                {
                    CampaignId = campaignId,
                    SourceCityId = smallTown.Id,
                    Name = "Phandalin",
                    Classification = "Small Town",
                    Size = "Small",
                    Condition = "Recovering",
                    Geography = "Inland",
                    Architecture = "Simple",
                    Climate = "Temperate",
                    Religion = "Mixed",
                    Vibe = "Rustic",
                    Languages = "Common",
                    Description = "A small rural town",
                    IsVisibleToPlayers = false,
                    SortOrder = 2
                }
            }).SetName("CityInstanceFactory creates correct city instance from small town");
        }
    }

    public class CityInstanceFactoryScenarioAndExpected
    {
        public string Scenario { get; set; }
        public CityDomain SourceCity { get; set; }
        public Guid CampaignId { get; set; }
        public int SortOrder { get; set; }
        public CampaignCityInstanceDomain Expected { get; set; }
    }
}
