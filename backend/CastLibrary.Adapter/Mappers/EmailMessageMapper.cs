using MimeKit;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Adapter.Mappers;

public static class EmailMessageMapper
{
    public static MimeMessage ToMimeMessage(
        PasswordResetEmailDomain emailData,
        string fromAddress,
        string fromName)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, fromAddress));
        message.To.Add(new MailboxAddress(emailData.DisplayName, emailData.ToEmail));
        message.Subject = "Reset Your Cast Library Password";

        var builder = new BodyBuilder
        {
            HtmlBody = $"""
                <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:24px;background:#fdf8f0;border:1px solid #d4b896;border-radius:4px">
                  <h2 style="color:#6e4b16;margin-top:0">Password Reset Request</h2>
                  <p style="color:#3d2b0e">Greetings, <strong>{emailData.DisplayName}</strong>.</p>
                  <p style="color:#3d2b0e">A request has been made to reset the password for your Cast Library account. Click the link below to set a new password. This link expires in <strong>1 hour</strong>.</p>
                  <p style="text-align:center;margin:28px 0">
                    <a href="{emailData.ResetLink}"
                       style="background:#6e4b16;color:#fdf8f0;padding:12px 24px;border-radius:3px;text-decoration:none;font-family:'Cinzel',Georgia,serif;font-size:14px;letter-spacing:0.05em">
                      Reset My Password
                    </a>
                  </p>
                  <p style="color:#3d2b0e;font-size:13px">If you did not request this reset, you may safely ignore this message. Your password will not change.</p>
                  <hr style="border:none;border-top:1px solid #d4b896;margin:20px 0" />
                  <p style="color:#9a7a4a;font-size:11px;text-align:center">· · · Cast Library · · ·</p>
                </div>
                """,
        };

        message.Body = builder.ToMessageBody();
        return message;
    }

    public static MimeMessage ToBugReportMimeMessage(
        BugReportNotificationEmailDomain data,
        string fromAddress,
        string fromName,
        string toAddress)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, fromAddress));
        message.To.Add(new MailboxAddress("Admin", toAddress));
        message.Subject = $"[Bug Report] [{data.Severity}] {data.Title}";

        var steps = string.IsNullOrWhiteSpace(data.StepsToReproduce)
            ? "<p style=\"color:#3d2b0e;font-style:italic\">Not provided.</p>"
            : $"<p style=\"color:#3d2b0e;white-space:pre-wrap\">{data.StepsToReproduce}</p>";

        var pageUrl = string.IsNullOrWhiteSpace(data.PageUrl)
            ? "N/A"
            : $"<a href=\"{data.PageUrl}\" style=\"color:#6e4b16\">{data.PageUrl}</a>";

        var builder = new BodyBuilder
        {
            HtmlBody = $"""
                <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:24px;background:#fdf8f0;border:1px solid #d4b896;border-radius:4px">
                  <h2 style="color:#6e4b16;margin-top:0">New Bug Report</h2>
                  <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
                    <tr>
                      <td style="color:#9a7a4a;font-size:13px;padding:4px 8px 4px 0;width:140px">Severity</td>
                      <td style="color:#3d2b0e;font-weight:bold;padding:4px 0">{data.Severity}</td>
                    </tr>
                    <tr>
                      <td style="color:#9a7a4a;font-size:13px;padding:4px 8px 4px 0">Reported by</td>
                      <td style="color:#3d2b0e;padding:4px 0">{data.ReporterDisplayName}</td>
                    </tr>
                    <tr>
                      <td style="color:#9a7a4a;font-size:13px;padding:4px 8px 4px 0">Reported at</td>
                      <td style="color:#3d2b0e;padding:4px 0">{data.ReportedAt:yyyy-MM-dd HH:mm} UTC</td>
                    </tr>
                    <tr>
                      <td style="color:#9a7a4a;font-size:13px;padding:4px 8px 4px 0">Page</td>
                      <td style="color:#3d2b0e;padding:4px 0">{pageUrl}</td>
                    </tr>
                    <tr>
                      <td style="color:#9a7a4a;font-size:13px;padding:4px 8px 4px 0">Device</td>
                      <td style="color:#3d2b0e;padding:4px 0">{data.Device}</td>
                    </tr>
                    <tr>
                      <td style="color:#9a7a4a;font-size:13px;padding:4px 8px 4px 0">Browser</td>
                      <td style="color:#3d2b0e;padding:4px 0">{data.Browser}</td>
                    </tr>
                    <tr>
                      <td style="color:#9a7a4a;font-size:13px;padding:4px 8px 4px 0">OS</td>
                      <td style="color:#3d2b0e;padding:4px 0">{data.Os}</td>
                    </tr>
                    <tr>
                      <td style="color:#9a7a4a;font-size:13px;padding:4px 8px 4px 0">Resolution</td>
                      <td style="color:#3d2b0e;padding:4px 0">{data.ScreenResolution}</td>
                    </tr>
                  </table>
                  <hr style="border:none;border-top:1px solid #d4b896;margin:16px 0" />
                  <h3 style="color:#6e4b16;margin-bottom:6px">{data.Title}</h3>
                  <p style="color:#3d2b0e;white-space:pre-wrap">{data.Description}</p>
                  <h4 style="color:#6e4b16;margin-bottom:6px">Steps to Reproduce</h4>
                  {steps}
                  <hr style="border:none;border-top:1px solid #d4b896;margin:20px 0" />
                  <p style="color:#9a7a4a;font-size:11px;text-align:center">· · · Cast Library · · ·</p>
                </div>
                """,
        };

        message.Body = builder.ToMessageBody();
        return message;
    }
}
