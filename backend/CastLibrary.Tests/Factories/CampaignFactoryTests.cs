using CastLibrary.Logic.Factories;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;
using FluentAssertions;
using NUnit.Framework;

namespace CastLibrary.Tests.Factories;

[TestFixture]
public class CampaignFactoryTests
{
    private CampaignFactory _factory;

    [SetUp]
    public void Setup()
    {
        _factory = new CampaignFactory();
    }

    [TestCaseSource(typeof(CampaignFactoryTestDataSource), "TestCases")]
    public void Create_CreatesCorrectCampaign(CampaignFactoryScenarioAndExpected testCase)
    {
        // Arrange
        var request = testCase.CreateCampaignRequest;
        var dmUserId = testCase.DmUserId;

        // Act
        var result = _factory.Create(request, dmUserId);

        // Assert
        result.Should().BeEquivalentTo(testCase.Expected, options => 
            options.Excluding(x => x.Id).Excluding(x => x.CreatedAt));
        result.Id.Should().NotBeEmpty();
        result.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
    }

    private class CampaignFactoryTestDataSource
    {
        public static IEnumerable<TestCaseData> TestCases()
        {
            var dmUserId = Guid.NewGuid();

            yield return new TestCaseData(new CampaignFactoryScenarioAndExpected
            {
                Scenario = "Create campaign with valid request",
                CreateCampaignRequest = new CreateCampaignRequest
                {
                    Name = "Dragon Heist",
                    Description = "A classic adventure module",
                    FantasyType = "Dungeons & Dragons"
                },
                DmUserId = dmUserId,
                Expected = new CampaignDomain
                {
                    DmUserId = dmUserId,
                    Name = "Dragon Heist",
                    Description = "A classic adventure module",
                    FantasyType = "Dungeons & Dragons",
                    Status = CampaignStatus.Active
                }
            }).SetName("CampaignFactory creates correct campaign with valid request");

            yield return new TestCaseData(new CampaignFactoryScenarioAndExpected
            {
                Scenario = "Create campaign with minimal data",
                CreateCampaignRequest = new CreateCampaignRequest
                {
                    Name = "Lost Mines",
                    Description = "",
                    FantasyType = "Dungeons & Dragons"
                },
                DmUserId = dmUserId,
                Expected = new CampaignDomain
                {
                    DmUserId = dmUserId,
                    Name = "Lost Mines",
                    Description = "",
                    FantasyType = "Dungeons & Dragons",
                    Status = CampaignStatus.Active
                }
            }).SetName("CampaignFactory creates correct campaign with minimal data");

            yield return new TestCaseData(new CampaignFactoryScenarioAndExpected
            {
                Scenario = "Create campaign with different fantasy type",
                CreateCampaignRequest = new CreateCampaignRequest
                {
                    Name = "Star Wars Campaign",
                    Description = "A galaxy far far away",
                    FantasyType = "Star Wars"
                },
                DmUserId = dmUserId,
                Expected = new CampaignDomain
                {
                    DmUserId = dmUserId,
                    Name = "Star Wars Campaign",
                    Description = "A galaxy far far away",
                    FantasyType = "Star Wars",
                    Status = CampaignStatus.Active
                }
            }).SetName("CampaignFactory creates correct campaign with different fantasy type");
        }
    }

    public class CampaignFactoryScenarioAndExpected
    {
        public string Scenario { get; set; }
        public CreateCampaignRequest CreateCampaignRequest { get; set; }
        public Guid DmUserId { get; set; }
        public CampaignDomain Expected { get; set; }
    }
}
