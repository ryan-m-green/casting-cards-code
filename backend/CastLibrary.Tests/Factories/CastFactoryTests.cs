using CastLibrary.Logic.Factories;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using FluentAssertions;
using NUnit.Framework;

namespace CastLibrary.Tests.Factories;

[TestFixture]
public class CastFactoryTests
{
    private CastFactory _factory;

    [SetUp]
    public void Setup()
    {
        _factory = new CastFactory();
    }

    [TestCaseSource(typeof(CastFactoryTestDataSource), "TestCases")]
    public void Create_CreatesCorrectCast(CastFactoryScenarioAndExpected testCase)
    {
        // Arrange
        var request = testCase.CreateCastRequest;
        var dmUserId = testCase.DmUserId;

        // Act
        var result = _factory.Create(request, dmUserId);

        // Assert
        result.Should().BeEquivalentTo(testCase.Expected, options =>
            options.Excluding(x => x.Id).Excluding(x => x.CreatedAt));
        result.Id.Should().NotBeEmpty();
        result.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
    }

    private class CastFactoryTestDataSource
    {
        public static IEnumerable<TestCaseData> TestCases()
        {
            var dmUserId = Guid.NewGuid();

            yield return new TestCaseData(new CastFactoryScenarioAndExpected
            {
                Scenario = "Create cast with all properties",
                CreateCastRequest = new CreateCastRequest
                {
                    Name = "Elara",
                    Pronouns = "she/her",
                    Race = "Elf",
                    Role = "Ranger",
                    Age = "150",
                    Alignment = "Chaotic Good",
                    Posture = "Graceful",
                    Speed = "Fast",
                    VoicePlacement = new[] { "High" },
                    Description = "A skilled elven ranger",
                    PublicDescription = "A ranger"
                },
                DmUserId = dmUserId,
                Expected = new CastDomain
                {
                    DmUserId = dmUserId,
                    Name = "Elara",
                    Pronouns = "she/her",
                    Race = "Elf",
                    Role = "Ranger",
                    Age = "150",
                    Alignment = "Chaotic Good",
                    Posture = "Graceful",
                    Speed = "Fast",
                    VoicePlacement = new[] { "High" },
                    Description = "A skilled elven ranger",
                    PublicDescription = "A ranger"
                }
            }).SetName("CastFactory creates correct cast with all properties");

            yield return new TestCaseData(new CastFactoryScenarioAndExpected
            {
                Scenario = "Create cast with minimal data",
                CreateCastRequest = new CreateCastRequest
                {
                    Name = "Guard",
                    Pronouns = "they/them",
                    Race = "Human",
                    Role = "Guard",
                    Age = "30",
                    Alignment = "Lawful Neutral",
                    Posture = "Upright",
                    Speed = "Normal",
                    VoicePlacement = new[] { "Mid" },
                    Description = "A town guard",
                    PublicDescription = ""
                },
                DmUserId = dmUserId,
                Expected = new CastDomain
                {
                    DmUserId = dmUserId,
                    Name = "Guard",
                    Pronouns = "they/them",
                    Race = "Human",
                    Role = "Guard",
                    Age = "30",
                    Alignment = "Lawful Neutral",
                    Posture = "Upright",
                    Speed = "Normal",
                    VoicePlacement = new[] { "Mid" },
                    Description = "A town guard",
                    PublicDescription = ""
                }
            }).SetName("CastFactory creates correct cast with minimal data");

            yield return new TestCaseData(new CastFactoryScenarioAndExpected
            {
                Scenario = "Create cast with different race and role",
                CreateCastRequest = new CreateCastRequest
                {
                    Name = "Grommak",
                    Pronouns = "he/him",
                    Race = "Dwarf",
                    Role = "Paladin",
                    Age = "250",
                    Alignment = "Lawful Good",
                    Posture = "Stocky",
                    Speed = "Medium",
                    VoicePlacement = new[] { "Deep" },
                    Description = "A dwarven paladin",
                    PublicDescription = "A paladin"
                },
                DmUserId = dmUserId,
                Expected = new CastDomain
                {
                    DmUserId = dmUserId,
                    Name = "Grommak",
                    Pronouns = "he/him",
                    Race = "Dwarf",
                    Role = "Paladin",
                    Age = "250",
                    Alignment = "Lawful Good",
                    Posture = "Stocky",
                    Speed = "Medium",
                    VoicePlacement = new[] { "Deep" },
                    Description = "A dwarven paladin",
                    PublicDescription = "A paladin"
                }
            }).SetName("CastFactory creates correct cast with different race and role");
        }
    }

    public class CastFactoryScenarioAndExpected
    {
        public string Scenario { get; set; }
        public CreateCastRequest CreateCastRequest { get; set; }
        public Guid DmUserId { get; set; }
        public CastDomain Expected { get; set; }
    }
}
