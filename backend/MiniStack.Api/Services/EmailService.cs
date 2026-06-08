using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace MiniStack.Api.Services;

public class EmailService(IConfiguration config, ILogger<EmailService> logger)
{
    public async Task SendPasswordResetAsync(string toEmail, string resetLink)
    {
        var smtpHost = config["Email:SmtpHost"];

        // Dev fallback: log the link when SMTP is not configured
        if (string.IsNullOrEmpty(smtpHost))
        {
            logger.LogWarning(
                "Email:SmtpHost not configured. Password reset link for {Email}: {Link}",
                toEmail, resetLink);
            return;
        }

        var from = config["Email:FromAddress"] ?? "noreply@ministack.app";
        var message = new MimeMessage();
        message.From.Add(MailboxAddress.Parse(from));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = "Reset your MiniStack password";
        message.Body = new TextPart("html")
        {
            Text = $"""
                <!DOCTYPE html>
                <html>
                <body style="font-family:sans-serif;max-width:480px;margin:40px auto;color:#111">
                  <h2>Reset your password</h2>
                  <p>We received a request to reset the password for your MiniStack account.</p>
                  <p style="margin:24px 0">
                    <a href="{resetLink}"
                       style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
                      Reset password
                    </a>
                  </p>
                  <p style="color:#666;font-size:14px">
                    This link expires in 1 hour. If you didn't request a reset, you can safely ignore this email.
                  </p>
                </body>
                </html>
                """,
        };

        using var smtp = new SmtpClient();

        var port         = int.Parse(config["Email:SmtpPort"] ?? "587");
        var socketOption = port == 465 ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls;
        await smtp.ConnectAsync(smtpHost, port, socketOption);

        var username = config["Email:Username"];
        var password = config["Email:Password"] ?? string.Empty;
        if (!string.IsNullOrEmpty(username))
            await smtp.AuthenticateAsync(username, password);

        await smtp.SendAsync(message);
        await smtp.DisconnectAsync(quit: true);
    }
}
