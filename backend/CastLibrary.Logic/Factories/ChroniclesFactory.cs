using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.Logic.Factories;

public interface IChroniclesFactory
{
    ChroniclesResponse CreateFromRawData(
        IEnumerable<ChroniclesRowEntity> sessionRows,
        (int TotalSessions, int TotalChronicles) counts,
        int pageNumber,
        int pageSize);

    List<ChroniclesSessionResponse> CreateSessionsListFromRawData(IEnumerable<SessionRowEntity> rows);
}

public class ChroniclesFactory(IImageStorageOperator imageStorageOperator) : IChroniclesFactory
{
    public ChroniclesResponse CreateFromRawData(
        IEnumerable<ChroniclesRowEntity> sessionRows,
        (int TotalSessions, int TotalChronicles) counts,
        int pageNumber,
        int pageSize)
    {
        var sessionsDict = new Dictionary<Guid, ChroniclesSessionResponse>();

        foreach (var row in sessionRows)
        {
            var sessionId = row.SessionId;
            if (!sessionsDict.ContainsKey(sessionId))
            {
                sessionsDict[sessionId] = new ChroniclesSessionResponse
                {
                    SessionId = sessionId,
                    SessionNumber = row.SessionNumber,
                    Title = row.Title,
                    AlternateTitle = row.AlternateTitle,
                    StartTime = row.StartTime,
                    InGameDays = row.InGameDays ?? Array.Empty<int>(),
                    ChronicleCount = row.ChronicleCount,
                    Chronicles = new List<ChronicleItemResponse>()
                };
            }

            if (row.ChronicleId != Guid.Empty)
            {
                var imageUrl = !string.IsNullOrEmpty(row.FilePath) ? imageStorageOperator.GetPublicUrl(row.FilePath) : null;

                sessionsDict[sessionId].Chronicles.Add(new ChronicleItemResponse
                {
                    Id = row.ChronicleId,
                    Title = row.ChronicleTitle,
                    Body = row.ChronicleBody,
                    LinkedEntities = System.Text.Json.JsonSerializer.Deserialize<List<LinkedEntityTrigger>>(row.LinkedEntities) ?? new List<LinkedEntityTrigger>(),
                    ImageUrl = imageUrl,
                    TodSliceName = row.TodSliceName,
                    IsGmOnly = row.IsGmOnly,
                    ArchivedAt = row.ArchivedAt,
                    SortOrder = row.SortOrder
                });
            }
        }

        var totalPages = (int)Math.Ceiling((double)counts.TotalSessions / pageSize);

        return new ChroniclesResponse
        {
            Sessions = sessionsDict.Values.OrderByDescending(s => s.StartTime).ToList(),
            TotalSessions = counts.TotalSessions,
            TotalChronicles = counts.TotalChronicles,
            CurrentPage = pageNumber,
            TotalPages = totalPages
        };
    }

    public List<ChroniclesSessionResponse> CreateSessionsListFromRawData(IEnumerable<SessionRowEntity> rows)
    {
        return rows.Select(row => new ChroniclesSessionResponse
        {
            SessionId = row.SessionId,
            SessionNumber = row.SessionNumber,
            Title = row.Title,
            AlternateTitle = row.AlternateTitle,
            StartTime = row.StartTime,
            InGameDays = row.InGameDays,
            ChronicleCount = row.ChronicleCount,
            Chronicles = new List<ChronicleItemResponse>()
        }).ToList();

    }
}

