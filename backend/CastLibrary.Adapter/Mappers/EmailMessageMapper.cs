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
}
