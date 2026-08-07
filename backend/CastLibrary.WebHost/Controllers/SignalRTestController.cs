using CastLibrary.WebHost.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class SignalRTestController(ISignalRNotificationService notificationService) : ControllerBase
{
    /// <summary>
    /// Get all available SignalR event names with mock payload examples
    /// Automatically captures any future events added to the system
    /// </summary>
    [HttpGet("events")]
    public IActionResult GetAllEventNamesWithMockPayloads()
    {
        try
        {
            var eventNames = notificationService.GetAllEventNames();
            var mockTestCampaignId = Guid.NewGuid();
            
            var eventsWithMocks = eventNames.Select(eventName => new
            {
                eventName = eventName,
                mockPayload = GenerateMockPayload(eventName, mockTestCampaignId)
            }).ToList();

            return Ok(new
            {
                totalEvents = eventsWithMocks.Count,
                testCampaignId = mockTestCampaignId,
                timestamp = DateTime.UtcNow,
                events = eventsWithMocks
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Get mock payload for a specific event
    /// </summary>
    [HttpGet("events/{eventName}/mock")]
    public IActionResult GetMockPayloadForEvent(string eventName)
    {
        var eventNames = notificationService.GetAllEventNames();
        if (!eventNames.Contains(eventName, StringComparer.OrdinalIgnoreCase))
        {
            return NotFound(new { error = $"Event '{eventName}' not found" });
        }

        var mockTestCampaignId = Guid.NewGuid();
        var mockPayload = GenerateMockPayload(eventName, mockTestCampaignId);

        return Ok(new
        {
            eventName = eventName,
            testCampaignId = mockTestCampaignId,
            timestamp = DateTime.UtcNow,
            mockPayload = mockPayload
        });
    }

    /// <summary>
    /// Broadcast all SignalR events to a specific campaign (for testing purposes)
    /// </summary>
    [HttpPost("broadcast-all/{campaignId}")]
    public async Task<IActionResult> BroadcastAllEvents(Guid campaignId)
    {
        await notificationService.BroadcastAllEventsAsync(campaignId);
        return Ok(new
        {
            message = $"All SignalR events broadcasted to campaign {campaignId}",
            timestamp = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Broadcast a specific event to a campaign (for testing purposes)
    /// </summary>
    [HttpPost("broadcast/{campaignId}/{eventName}")]
    public async Task<IActionResult> BroadcastSpecificEvent(Guid campaignId, string eventName)
    {
        var testPayload = GenerateMockPayload(eventName, campaignId);

        await notificationService.BroadcastToCampaignAsync(campaignId, eventName, testPayload);
        return Ok(new
        {
            message = $"Event '{eventName}' broadcasted to campaign {campaignId}",
            timestamp = DateTime.UtcNow,
            payload = testPayload
        });
    }

    /// <summary>
    /// Dynamically generate mock payload based on event name
    /// This automatically handles any future events added to the system
    /// </summary>
    private object GenerateMockPayload(string eventName, Guid campaignId)
    {
        try
        {
            var timestamp = DateTime.UtcNow;
            var testGuid = Guid.NewGuid();
            
            // Generate contextual mock data based on event name patterns
            return eventName.ToLower() switch
            {
                // Secret Events
                var name when name.Contains("secret") && name.Contains("revealed") => new
                {
                    secretId = testGuid,
                    campaignId = campaignId,
                    castInstanceId = (Guid?)null,
                    locationInstanceId = (Guid?)null,
                    sublocationInstanceId = (Guid?)null,
                    secretContent = "This is a mock secret content for testing",
                    timestamp = timestamp
                },
                var name when name.Contains("secret") && name.Contains("created") => new
                {
                    secretId = testGuid,
                    campaignId = campaignId,
                    castInstanceId = (Guid?)null,
                    locationInstanceId = testGuid,
                    sublocationInstanceId = (Guid?)null,
                    content = "Mock secret content",
                    sortOrder = 1,
                    timestamp = timestamp
                },
                var name when name.Contains("secret") && name.Contains("deleted") => new
                {
                    secretId = testGuid,
                    campaignId = campaignId,
                    timestamp = timestamp
                },
                var name when name.Contains("secret") && name.Contains("delivered") => new
                {
                    secretId = testGuid,
                    campaignId = campaignId,
                    playerUserId = testGuid,
                    timestamp = timestamp
                },
                var name when name.Contains("secret") && name.Contains("resealed") => new
                {
                    secretId = testGuid,
                    campaignId = campaignId,
                    castInstanceId = (Guid?)null,
                    locationInstanceId = (Guid?)null,
                    sublocationInstanceId = (Guid?)null,
                    timestamp = timestamp
                },
                var name when name.Contains("secret") && name.Contains("shared") => new
                {
                    secretId = testGuid,
                    campaignId = campaignId,
                    fromPlayerUserId = testGuid,
                    toPlayerUserIds = new[] { Guid.NewGuid(), Guid.NewGuid() },
                    timestamp = timestamp
                },
                
                // Visibility Events
                var name when name.Contains("visibility") && name.Contains("card") => new
                {
                    campaignId = campaignId,
                    instanceId = testGuid,
                    cardType = "location",
                    isVisible = true,
                    tickCount = DateTime.UtcNow.Ticks,
                    title = "Mock Location Title",
                    body = "Mock location body content",
                    playerCardName = "Test Player",
                    playerCardRace = "Human",
                    playerCardClass = "Fighter",
                    playerCardImageUrl = "https://example.com/image.jpg",
                    timestamp = timestamp
                },
                var name when name.Contains("visibility") && name.Contains("bulk") => new
                {
                    campaignId = campaignId,
                    parentInstanceId = testGuid,
                    cardType = "sublocation",
                    isVisible = true,
                    timestamp = timestamp
                },
                
                // Campaign Entity Events
                var name when name.Contains("cast") && name.Contains("updated") => new
                {
                    campaignId = campaignId,
                    castInstanceId = testGuid,
                    timestamp = timestamp
                },
                var name when name.Contains("location") && name.Contains("updated") => new
                {
                    campaignId = campaignId,
                    locationInstanceId = testGuid,
                    timestamp = timestamp
                },
                var name when name.Contains("sublocation") && name.Contains("updated") => new
                {
                    campaignId = campaignId,
                    sublocationInstanceId = testGuid,
                    timestamp = timestamp
                },
                var name when name.Contains("faction") && name.Contains("updated") => new
                {
                    campaignId = campaignId,
                    factionInstanceId = testGuid,
                    timestamp = timestamp
                },
                var name when name.Contains("faction") && name.Contains("removed") => new
                {
                    campaignId = campaignId,
                    factionInstanceId = testGuid,
                    timestamp = timestamp
                },
                var name when name.Contains("faction") && name.Contains("locked") => new
                {
                    campaignId = campaignId,
                    factionInstanceId = testGuid,
                    isLocked = true,
                    timestamp = timestamp
                },
                
                // Player Events
                var name when name.Contains("player") && name.Contains("condition") => new
                {
                    campaignId = campaignId,
                    playerUserId = testGuid,
                    condition = "Healthy",
                    timestamp = timestamp
                },
                var name when name.Contains("player") && name.Contains("gold") => new
                {
                    campaignId = campaignId,
                    playerUserId = testGuid,
                    goldAmount = 150,
                    timestamp = timestamp
                },
                
                // Time & Session Events
                var name when name.Contains("time") && name.Contains("advanced") => new
                {
                    campaignId = campaignId,
                    newTime = "12:00",
                    dayCount = 5,
                    timestamp = timestamp
                },
                var name when name.Contains("day") && name.Contains("advanced") => new
                {
                    campaignId = campaignId,
                    newDay = 6,
                    timestamp = timestamp
                },
                var name when name.Contains("session") && name.Contains("started") => new
                {
                    campaignId = campaignId,
                    sessionNumber = 10,
                    timestamp = timestamp
                },
                
                // Notes Events
                var name when name.Contains("note") => new
                {
                    campaignId = campaignId,
                    noteId = testGuid,
                    content = "Mock note content for testing",
                    timestamp = timestamp
                },
                
                // Shop Events
                var name when name.Contains("shop") => new
                {
                    campaignId = campaignId,
                    shopInstanceId = testGuid,
                    itemId = testGuid,
                    itemName = "Mock Item",
                    price = 50,
                    currency = "gp",
                    timestamp = timestamp
                },
                
                // System Events
                var name when name.Contains("inventory") => new
                {
                    campaignId = campaignId,
                    playerUserId = testGuid,
                    action = "updated",
                    timestamp = timestamp
                },
                var name when name.Contains("soundtrack") => new
                {
                    campaignId = campaignId,
                    trackName = "Mock Track",
                    isPlaying = true,
                    timestamp = timestamp
                },
                var name when name.Contains("subscription") => new
                {
                    userId = testGuid,
                    status = "Active",
                    timestamp = timestamp
                },
                var name when name.Contains("nav") => new
                {
                    campaignId = campaignId,
                    currentView = "map",
                    timestamp = timestamp
                },
                var name when name.Contains("storyline") => new
                {
                    campaignId = campaignId,
                    chapterId = testGuid,
                    chapterName = "Mock Chapter",
                    timestamp = timestamp
                },
                
                // Default fallback for unknown events
                _ => new
                {
                    campaignId = campaignId,
                    eventName = eventName,
                    timestamp = timestamp,
                    mockData = "Generic mock data for testing"
                }
            };
        }
        catch (Exception ex)
        {
            // Fallback to generic mock data if pattern matching fails
            return new
            {
                campaignId = campaignId,
                eventName = eventName,
                timestamp = DateTime.UtcNow,
                error = $"Mock generation failed: {ex.Message}",
                fallbackData = "Generic mock data"
            };
        }
    }
}