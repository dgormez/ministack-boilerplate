using System.ComponentModel.DataAnnotations;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
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
        }).RequireRateLimiting("auth-strict");

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
        }).RequireRateLimiting("auth-strict");

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

        // ── POST /api/auth/google ────────────────────────────────────────────
        group.MapPost("/google", async (GoogleAuthRequest req, AppDbContext db, JwtService jwt, IHttpClientFactory httpClientFactory, IConfiguration config) =>
        {
            GoogleTokenInfo? payload;
            try
            {
                var http = httpClientFactory.CreateClient();
                var res  = await http.GetAsync($"https://oauth2.googleapis.com/tokeninfo?id_token={req.IdToken}");
                if (!res.IsSuccessStatusCode) return Results.Unauthorized();
                payload = await res.Content.ReadFromJsonAsync<GoogleTokenInfo>();
            }
            catch { return Results.Unauthorized(); }

            if (payload?.Email is null || payload.EmailVerified != "true") return Results.Unauthorized();

            var allowedIds = config.GetSection("Google:AllowedClientIds").Get<string[]>() ?? [];
            if (payload.Aud is null || !allowedIds.Contains(payload.Aud)) return Results.Unauthorized();

            var user = await db.Users.FirstOrDefaultAsync(u => u.GoogleId == payload.Sub)
                    ?? await db.Users.FirstOrDefaultAsync(u => u.Email   == payload.Email.ToLower());

            if (user is null)
            {
                user = new User
                {
                    Email        = payload.Email.ToLower(),
                    GoogleId     = payload.Sub,
                    PasswordHash = string.Empty,
                };
                db.Users.Add(user);
            }
            else if (user.GoogleId is null)
            {
                user.GoogleId = payload.Sub;
            }

            var refreshToken = jwt.GenerateRefreshToken();
            user.RefreshToken       = refreshToken;
            user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(jwt.RefreshTokenExpiryDays);
            await db.SaveChangesAsync();

            return Results.Ok(new AuthResponse(
                jwt.GenerateAccessToken(user),
                refreshToken,
                new UserDto(user.Id, user.Email)));
        }).RequireRateLimiting("auth-oauth");

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

        // ── POST /api/auth/apple ─────────────────────────────────────────────
        group.MapPost("/apple", async (
            AppleAuthRequest req, AppDbContext db, JwtService jwt,
            IHttpClientFactory httpClientFactory, IConfiguration config) =>
        {
            var bundleId = config["Apple:BundleId"] ?? "com.dgit.ministack";
            var (sub, tokenEmail) = await VerifyAppleTokenAsync(req.IdentityToken, bundleId, httpClientFactory);
            if (sub is null) return Results.Unauthorized();

            // Apple only includes email on the first sign-in; accept it from the client too
            var email = req.Email?.ToLower().Trim() ?? tokenEmail?.ToLower();

            var user = await db.Users.FirstOrDefaultAsync(u => u.AppleId == sub)
                    ?? (email is not null ? await db.Users.FirstOrDefaultAsync(u => u.Email == email) : null);

            if (user is null)
            {
                if (email is null)
                    return Results.BadRequest(new { error = "Email is required for first-time Apple Sign In." });

                user = new User { Email = email, AppleId = sub, PasswordHash = string.Empty };
                db.Users.Add(user);
            }
            else if (user.AppleId is null)
            {
                user.AppleId = sub;
            }

            var refreshToken = jwt.GenerateRefreshToken();
            user.RefreshToken       = refreshToken;
            user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(jwt.RefreshTokenExpiryDays);
            await db.SaveChangesAsync();

            return Results.Ok(new AuthResponse(
                jwt.GenerateAccessToken(user), refreshToken, new UserDto(user.Id, user.Email)));
        }).RequireRateLimiting("auth-oauth");

        // ── POST /api/auth/forgot-password ───────────────────────────────────
        group.MapPost("/forgot-password", async (
            ForgotPasswordRequest req, AppDbContext db,
            EmailService emailService, IConfiguration config) =>
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email.ToLower().Trim());

            // Only allow reset for accounts that have a password (not pure OAuth accounts)
            if (user is not null && !string.IsNullOrEmpty(user.PasswordHash))
            {
                var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
                user.PasswordResetToken  = token;
                user.PasswordResetExpiry = DateTime.UtcNow.AddHours(1);
                await db.SaveChangesAsync();

                var scheme    = config["App:Scheme"] ?? "ministack";
                var resetLink = $"{scheme}://reset-password?token={token}";
                await emailService.SendPasswordResetAsync(user.Email, resetLink);
            }

            // Always 200 to prevent user enumeration
            return Results.Ok(new { message = "If that email is registered, a reset link has been sent." });
        }).RequireRateLimiting("auth-strict");

        // ── POST /api/auth/reset-password ────────────────────────────────────
        group.MapPost("/reset-password", async (ResetPasswordRequest req, AppDbContext db) =>
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.PasswordResetToken == req.Token);

            if (user is null || user.PasswordResetExpiry < DateTime.UtcNow)
                return Results.BadRequest(new { error = "This reset link is invalid or has expired." });

            user.PasswordHash        = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
            user.PasswordResetToken  = null;
            user.PasswordResetExpiry = null;
            // Invalidate all active sessions
            user.RefreshToken        = null;
            user.RefreshTokenExpiry  = null;
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Password has been reset. You can now sign in." });
        }).RequireRateLimiting("auth-strict");
    }

    // ── Apple identity-token verifier ─────────────────────────────────────────

    private static async Task<(string? Sub, string? Email)> VerifyAppleTokenAsync(
        string identityToken, string bundleId, IHttpClientFactory httpClientFactory)
    {
        try
        {
            var http     = httpClientFactory.CreateClient();
            var jwksJson = await http.GetStringAsync("https://appleid.apple.com/auth/keys");
            var jwks     = new JsonWebKeySet(jwksJson);

            var handler    = new JsonWebTokenHandler();
            var parameters = new TokenValidationParameters
            {
                ValidateIssuer           = true,
                ValidIssuer              = "https://appleid.apple.com",
                ValidateAudience         = true,
                ValidAudience            = bundleId,
                ValidateLifetime         = true,
                IssuerSigningKeys        = jwks.Keys,
                ValidateIssuerSigningKey = true,
            };

            var result = await handler.ValidateTokenAsync(identityToken, parameters);
            if (!result.IsValid) return (null, null);

            result.Claims.TryGetValue("sub",   out var sub);
            result.Claims.TryGetValue("email", out var email);
            return (sub?.ToString(), email?.ToString());
        }
        catch
        {
            return (null, null);
        }
    }
}

// ── Request / Response DTOs ────────────────────────────────────────────────────

public record GoogleAuthRequest([Required] string IdToken);

public record AppleAuthRequest([Required] string IdentityToken, string? Email);

public record ForgotPasswordRequest([Required, EmailAddress] string Email);

public record ResetPasswordRequest([Required] string Token, [Required, MinLength(8)] string NewPassword);

internal record GoogleTokenInfo(
    [property: JsonPropertyName("sub")]            string  Sub,
    [property: JsonPropertyName("email")]          string? Email,
    [property: JsonPropertyName("email_verified")] string? EmailVerified,
    [property: JsonPropertyName("aud")]            string? Aud);

public record RegisterRequest(
    [Required, EmailAddress, MaxLength(254)] string Email,
    [Required, MinLength(8)]                 string Password);

public record LoginRequest(
    [Required] string Email,
    [Required] string Password);

public record RefreshRequest([Required] string RefreshToken);

public record AuthResponse(string AccessToken, string RefreshToken, UserDto User);

public record UserDto(Guid Id, string Email);
