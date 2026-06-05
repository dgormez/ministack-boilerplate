using Microsoft.EntityFrameworkCore;
using MiniStack.Api.Models;

namespace MiniStack.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Note> Notes => Set<Note>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(u =>
        {
            u.HasKey(x => x.Id);
            u.HasIndex(x => x.Email).IsUnique();
            u.Property(x => x.Email).IsRequired().HasMaxLength(254);
            u.Property(x => x.PasswordHash).IsRequired();
        });

        modelBuilder.Entity<Note>(n =>
        {
            n.HasKey(x => x.Id);
            n.HasIndex(x => x.UserId);
            n.HasIndex(x => new { x.UserId, x.UpdatedAt }); // for incremental sync
            n.Property(x => x.Title).IsRequired().HasMaxLength(500);
            n.HasOne(x => x.User)
             .WithMany(u => u.Notes)
             .HasForeignKey(x => x.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
