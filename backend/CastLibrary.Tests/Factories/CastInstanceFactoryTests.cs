using CastLibrary.Logic.Factories;
using CastLibrary.Shared.Domain;
using FluentAssertions;
using NUnit.Framework;

namespace CastLibrary.Tests.Factories;

[TestFixture]
public class CastInstanceFactoryTests
{
    private CastInstanceFactory _factory;

    [SetUp]
    public void Setup()
    {
        _factory = new CastInstanceFactory();
    }

    [TestCaseSource(typeof(CastInstanceFactoryTestDataSource), "TestCases")]
    public void Create_CreatesCorrectCastInstance(CastInstanceFactoryScenarioAndExpected testCase)
    {
        // Arrange
        var source = testCase.SourceCast;
        var campaignId = testCase.CampaignId;
        var cityInstanceId = testCase.CityInstanceId;
        var locationInstanceId = testCase.LocationInstanceId;

        // Act
        var result = _factory.Create(source, campaignId, cityInstanceId, locationInstanceId);

        // Assert
        result.Should().BeEquivalentTo(testCase.Expected, options =>
            options.Excluding(x => x.InstanceId));
        result.InstanceId.Should().NotBeEmpty();
    }

    private class CastInstanceFactoryTestDataSource
    {
        public static IEnumerable<TestCaseData> TestCases()
        {
            var sourceCast = new CastDomain
            {
                Id = Guid.NewGuid(),
                Name = "Gandalf",
                Pronouns = "he/him",
                Race = "Human",
                Role = "Wizard",
                Age = "2000",
                Alignment = "Neutral Good",
                Posture = "Stooped",
                Speed = "Slow",
                VoicePlacement = new[] { "Deep" },
                Description = "A powerful wizard",
                PublicDescription = "An old wizard"
            };

            var campaignId = Guid.NewGuid();
            var cityInstanceId = Guid.NewGuid();
            var locationInstanceId = Guid.NewGuid();

            yield return new TestCaseData(new CastInstanceFactoryScenarioAndExpected
            {
                Scenario = "Create cast instance with all properties",
                SourceCast = sourceCast,
                CampaignId = campaignId,
                CityInstanceId = cityInstanceId,
                LocationInstanceId = locationInstanceId,
                Expected = new CampaignCastInstanceDomain
                {
                    CampaignId = campaignId,
                    SourceCastId = sourceCast.Id,
                    CityInstanceId = cityInstanceId,
                    LocationInstanceId = locationInstanceId,
                    Name = "Gandalf",
                    Pronouns = "he/him",
                    Race = "Human",
                    Role = "Wizard",
                    Age = "2000",
                    Alignment = "Neutral Good",
                    Posture = "Stooped",
                    Speed = "Slow",
                    VoicePlacement = new[] { "Deep" },
                    Description = "A powerful wizard",
                    PublicDescription = "An old wizard",
                    IsVisibleToPlayers = false
                }
            }).SetName("CastInstanceFactory creates correct cast instance with all properties");

            yield return new TestCaseData(new CastInstanceFactoryScenarioAndExpected
            {
                Scenario = "Create cast instance without city instance",
                SourceCast = sourceCast,
                CampaignId = campaignId,
                CityInstanceId = null,
                LocationInstanceId = locationInstanceId,
                Expected = new CampaignCastInstanceDomain
                {
                    CampaignId = campaignId,
                    SourceCastId = sourceCast.Id,
                    CityInstanceId = null,
                    LocationInstanceId = locationInstanceId,
                    Name = "Gandalf",
                    Pronouns = "he/him",
                    Race = "Human",
                    Role = "Wizard",
                    Age = "2000",
                    Alignment = "Neutral Good",
                    Posture = "Stooped",
                    Speed = "Slow",
                    VoicePlacement = new[] { "Deep" },
                    Description = "A powerful wizard",
                    PublicDescription = "An old wizard",
                    IsVisibleToPlayers = false
                }
            }).SetName("CastInstanceFactory creates correct cast instance without city instance");

            var minimalCast = new CastDomain
            {
                Id = Guid.NewGuid(),
                Name = "Guard",
                Pronouns = "they/them",
                Race = "Human",
                Role = "Guard",
                Age = "25",
                Alignment = "Lawful Neutral",
                Posture = "Upright",
                Speed = "Normal",
                VoicePlacement = new[] { "Mid" },
                Description = "A town guard",
                PublicDescription = "Guard"
            };

            yield return new TestCaseData(new CastInstanceFactoryScenarioAndExpected
            {
                Scenario = "Create cast instance from minimal cast",
                SourceCast = minimalCast,
                CampaignId = campaignId,
                CityInstanceId = cityInstanceId,
                LocationInstanceId = locationInstanceId,
                Expected = new CampaignCastInstanceDomain
                {
                    CampaignId = campaignId,
                    SourceCastId = minimalCast.Id,
                    CityInstanceId = cityInstanceId,
                    LocationInstanceId = locationInstanceId,
                    Name = "Guard",
                    Pronouns = "they/them",
                    Race = "Human",
                    Role = "Guard",
                    Age = "25",
                    Alignment = "Lawful Neutral",
                    Posture = "Upright",
                    Speed = "Normal",
                    VoicePlacement = new[] { "Mid" },
                    Description = "A town guard",
                    PublicDescription = "Guard",
                    IsVisibleToPlayers = false
                }
            }).SetName("CastInstanceFactory creates correct cast instance from minimal cast");
        }
    }

    public class CastInstanceFactoryScenarioAndExpected
    {
        public string Scenario { get; set; }
        public CastDomain SourceCast { get; set; }
        public Guid CampaignId { get; set; }
        public Guid? CityInstanceId { get; set; }
        public Guid LocationInstanceId { get; set; }
        public CampaignCastInstanceDomain Expected { get; set; }
    }
}
