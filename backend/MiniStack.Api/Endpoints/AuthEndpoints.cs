using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MiniStack.Api.Data;
using MiniStack.Api.Models;
using MiniStack.Api.Services;

namespace MiniStack.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        // ── POST /api/auth/register ──────────────────────────────────────────
        group.MapPost("/register", async (RegisterRequest req, AppDbContext db, JwtService jwt) =>
        {
            if (await db.Users.AnyAsync(u => u.Email == req.Email.ToLower()))
                return Results.Conflict(new { error = "An account with this email already exists." });

            var user = new User
            {
                Email        = req.Email.ToLower().Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            };

            var refreshToken = jwt.GenerateRefreshToken();
            user.RefreshToken       = refreshToken;
            user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(jwt.RefreshTokenExpiryDays);

            db.Users.Add(user);
            await db.SaveChangesAsync();

            return Results.Ok(new AuthResponse(
                jwt.GenerateAccessToken(user),
                refreshToken,
                new UserDto(user.Id, user.Email)));
        });

        // ── POST /api/auth/login ─────────────────────────────────────────────
        group.MapPost("/login", async (LoginRequest req, AppDbContext db, JwtService jwt) =>
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email.ToLower().Trim());

            if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
                return Results.Unauthorized();

            var refreshToken = jwt.GenerateRefreshToken();
            user.RefreshToken       = refreshToken;
            user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(jwt.RefreshTokenExpiryDays);
            await db.SaveChangesAsync();

            return Results.Ok(new AuthResponse(
                jwt.GenerateAccessToken(user),
                refreshToken,
                new UserDto(user.Id, user.Email)));
        });

        // ── POST /api/auth/refresh ───────────────────────────────────────────
        group.MapPost("/refresh", async (RefreshRequest req, AppDbContext db, JwtService jwt) =>
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.RefreshToken == req.RefreshToken);

            if (user is null || user.RefreshTokenExpiry < DateTime.UtcNow)
                return Results.Unauthorized();

            var newRefreshToken = jwt.GenerateRefreshToken();
            user.RefreshToken       = newRefreshToken;
            user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(jwt.RefreshTokenExpiryDays);
            await db.SaveChangesAsync();

            return Results.Ok(new AuthResponse(
                jwt.GenerateAccessToken(user),
                newRefreshToken,
                new UserDto(user.Id, user.Email)));
        });

        // ── POST /api/auth/logout ────────────────────────────────────────────
        group.MapPost("/logout", async (HttpContext context, AppDbContext db) =>
        {
            var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId is null) return Results.Unauthorized();

            var user = await db.Users.FindAsync(Guid.Parse(userId));
            if (user is not null)
            {
                user.RefreshToken       = null;
                user.RefreshTokenExpiry = null;
                await db.SaveChangesAsync();
            }

            return Results.NoContent();
        }).RequireAuthorization();

        // ── DELETE /api/auth/account ─────────────────────────────────────────
        group.MapDelete("/account", async (HttpContext context, AppDbContext db) =>
        {
            var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId is null) return Results.Unauthorized();

            var user = await db.Users.FindAsync(Guid.Parse(userId));
            if (user is null) return Results.NotFound();

            db.Users.Remove(user); // cascades to Notes
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).RequireAuthorization();
    }
}

// ── Request / Response DTOs ────────────────────────────────────────────────────

public record RegisterRequest(
    [Required, EmailAddress, MaxLength(254)] string Email,
    [Required, MinLength(8)]                 string Password);

public record LoginRequest(
    [Required] string Email,
    [Required] string Password);

public record RefreshRequest([Required] string RefreshToken);

public record AuthResponse(string AccessToken, string RefreshToken, UserDto User);

public record UserDto(Guid Id, string Email);
