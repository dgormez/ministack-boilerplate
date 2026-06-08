namespace MiniStack.Api.Models;

public class User
{
    public Guid   Id                  { get; set; } = Guid.NewGuid();
    public string Email               { get; set; } = string.Empty;
    public string PasswordHash        { get; set; } = string.Empty;
    public string? GoogleId           { get; set; }
    public string? AppleId            { get; set; }
    public string? RefreshToken       { get; set; }
    public DateTime? RefreshTokenExpiry  { get; set; }
    public string? PasswordResetToken   { get; set; }
    public DateTime? PasswordResetExpiry { get; set; }
    public string? ExpoPushToken        { get; set; }
    public DateTime CreatedAt         { get; set; } = DateTime.UtcNow;

    // Navigation
    public List<Note> Notes           { get; set; } = [];
}
