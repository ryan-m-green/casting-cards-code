using CastLibrary.Shared.Domain;

namespace CastLibrary.Adapter.EmailBuilders;

public class BugReportEmailTemplateBuilder : IEmailTemplateBuilder
{
    public bool IsMatch(Type type) => type == typeof(BugReportNotificationEmailDomain);

    public SenderEmailRequest GenerateTemplateRequest(IEmailDomain emailData, string fromEmail, string fromName, string adminAddress)
    {
        var data = (BugReportNotificationEmailDomain)emailData;
        return new SenderEmailRequest
        {
            From = new SenderRecipient { Email = fromEmail, Name = fromName },
            To = new SenderRecipient { Email = adminAddress, Name = "Admin" },
            Subject = $"Bug Report: {data.Title}",
            Html = $"<p><strong>From:</strong> {data.ReporterDisplayName}</p><p><strong>Title:</strong> {data.Title}</p><p><strong>Description:</strong> {data.Description}</p>"
        };
    }
}
