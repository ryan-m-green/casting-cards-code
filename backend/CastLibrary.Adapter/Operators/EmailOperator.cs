using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using CastLibrary.Adapter.Mappers;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Adapter.Operators;

public interface IEmailOperator
{
    Task SendPasswordResetEmailAsync(PasswordResetEmailDomain emailData);
}
public class EmailOperator(IConfiguration configuration) : IEmailOperator
{
    public async Task SendPasswordResetEmailAsync(PasswordResetEmailDomain emailData)
    {
        var host = configuration["Email:SmtpHost"]!;
        var port = int.Parse(configuration["Email:SmtpPort"]!);
        var username = configuration["Email:SmtpUsername"]!;
        var password = configuration["Email:SmtpPassword"]!;
        var fromAddress = configuration["Email:FromAddress"]!;
        var fromName = configuration["Email:FromName"]!;

        var message = EmailMessageMapper.ToMimeMessage(emailData, fromAddress, fromName);

        using var client = new SmtpClient();
        await client.ConnectAsync(host, port, SecureSocketOptions.StartTls);
        await client.AuthenticateAsync(username, password);
        await client.SendAsync(message);
        await client.DisconnectAsync(quit: true);
    }
}
