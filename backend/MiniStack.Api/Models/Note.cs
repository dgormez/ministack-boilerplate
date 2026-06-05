namespace MiniStack.Api.Models;

public class Note
{
    public Guid    Id        { get; set; } = Guid.NewGuid();
    public Guid    UserId    { get; set; }
    public User    User      { get; set; } = null!;
    public string  Title     { get; set; } = string.Empty;
    public string? Body      { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
