using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;

namespace CastLibrary.Repository.Mappers;

public interface IBugReportEntityMapper
{
    BugReportDomain ToDomain(BugReportEntity entity);
    BugReportEntity ToEntity(BugReportDomain domain);
}

public class BugReportEntityMapper : IBugReportEntityMapper
{
    public BugReportDomain ToDomain(BugReportEntity entity) => new()
    {
        Id = entity.Id,
        UserId = entity.UserId,
        Title = entity.Title,
        Description = entity.Description,
        StepsToReproduce = entity.StepsToReproduce,
        Severity = entity.Severity,
        PageUrl = entity.PageUrl,
        Device = entity.Device,
        Browser = entity.Browser,
        Os = entity.Os,
        ScreenResolution = entity.ScreenResolution,
        IsFixed = entity.IsFixed,
        FixedAt = entity.FixedAt,
        ReportedAt = entity.ReportedAt,
        ReporterDisplayName = entity.ReporterDisplayName,
    };

    public BugReportEntity ToEntity(BugReportDomain domain) => new()
    {
        Id = domain.Id,
        UserId = domain.UserId,
        Title = domain.Title,
        Description = domain.Description,
        StepsToReproduce = domain.StepsToReproduce,
        Severity = domain.Severity,
        PageUrl = domain.PageUrl,
        Device = domain.Device,
        Browser = domain.Browser,
        Os = domain.Os,
        ScreenResolution = domain.ScreenResolution,
        IsFixed = domain.IsFixed,
        FixedAt = domain.FixedAt,
        ReportedAt = domain.ReportedAt,
        ReporterDisplayName = domain.ReporterDisplayName,
    };
}
