using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MiniStack.Api.Data;
using MiniStack.Api.Models;

namespace MiniStack.Api.Endpoints;

public static class NoteEndpoints
{
    public static void MapNoteEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/notes")
                       .WithTags("Notes")
                       .RequireAuthorization();

        // ── GET /api/notes ───────────────────────────────────────────────────
        group.MapGet("/", async (HttpContext context, AppDbContext db) =>
        {
            var userId = GetUserId(context);
            var notes = await db.Notes
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.UpdatedAt)
                .Select(n => ToDto(n))
                .ToListAsync();

            return Results.Ok(notes);
        });

        // ── GET /api/notes/sync?since= ───────────────────────────────────────
        // Returns notes updated after `since` — used for incremental mobile sync.
        group.MapGet("/sync", async (HttpContext context, AppDbContext db, DateTime? since) =>
        {
            var userId = GetUserId(context);
            var query  = db.Notes.Where(n => n.UserId == userId);

            if (since.HasValue)
                query = query.Where(n => n.UpdatedAt > since.Value.ToUniversalTime());

            var notes = await query
                .OrderByDescending(n => n.UpdatedAt)
                .Select(n => ToDto(n))
                .ToListAsync();

            return Results.Ok(new { notes, syncedAt = DateTime.UtcNow });
        });

        // ── POST /api/notes ──────────────────────────────────────────────────
        group.MapPost("/", async (HttpContext context, CreateNoteRequest req, AppDbContext db) =>
        {
            var userId = GetUserId(context);
            var note   = new Note
            {
                UserId = userId,
                Title  = req.Title.Trim(),
                Body   = req.Body?.Trim(),
            };

            db.Notes.Add(note);
            await db.SaveChangesAsync();
            return Results.Created($"/api/notes/{note.Id}", ToDto(note));
        });

        // ── PUT /api/notes/{id} ──────────────────────────────────────────────
        group.MapPut("/{id:guid}", async (HttpContext context, Guid id, UpdateNoteRequest req, AppDbContext db) =>
        {
            var userId = GetUserId(context);
            var note   = await db.Notes.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

            if (note is null) return Results.NotFound();

            note.Title     = req.Title.Trim();
            note.Body      = req.Body?.Trim();
            note.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.Ok(ToDto(note));
        });

        // ── DELETE /api/notes/{id} ───────────────────────────────────────────
        group.MapDelete("/{id:guid}", async (HttpContext context, Guid id, AppDbContext db) =>
        {
            var userId = GetUserId(context);
            var note   = await db.Notes.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

            if (note is null) return Results.NotFound();

            db.Notes.Remove(note);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    private static Guid GetUserId(HttpContext context) =>
        Guid.Parse(context.User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    private static NoteDto ToDto(Note n) =>
        new(n.Id, n.UserId, n.Title, n.Body, n.CreatedAt, n.UpdatedAt);
}

// ── Request / Response DTOs ────────────────────────────────────────────────────

public record CreateNoteRequest(
    [Required, MaxLength(500)] string Title,
    string? Body);

public record UpdateNoteRequest(
    [Required, MaxLength(500)] string Title,
    string? Body);

public record NoteDto(
    Guid     Id,
    Guid     UserId,
    string   Title,
    string?  Body,
    DateTime CreatedAt,
    DateTime UpdatedAt);
