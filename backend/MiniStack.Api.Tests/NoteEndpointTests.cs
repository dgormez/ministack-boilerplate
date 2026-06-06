using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using MiniStack.Api.Endpoints;
using Xunit;

namespace MiniStack.Api.Tests;

public class NoteEndpointTests(MiniStackWebAppFactory factory)
    : IClassFixture<MiniStackWebAppFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string UniqueEmail() => $"user_{Guid.NewGuid():N}@test.com";

    private async Task<string> RegisterAndGetTokenAsync()
    {
        var res = await _client.PostAsJsonAsync("/api/auth/register",
            new { email = UniqueEmail(), password = "password123" });
        var body = await res.Content.ReadFromJsonAsync<AuthResponse>();
        return body!.AccessToken;
    }

    private void Authorize(string token) =>
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

    private void ClearAuth() =>
        _client.DefaultRequestHeaders.Authorization = null;

    // ── Tests ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetNotes_Unauthenticated_Returns401()
    {
        ClearAuth();
        var res = await _client.GetAsync("/api/notes");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task CreateNote_ValidRequest_Returns201WithLocation()
    {
        Authorize(await RegisterAndGetTokenAsync());

        var res = await _client.PostAsJsonAsync("/api/notes",
            new { title = "Hello", body = "World" });

        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        Assert.NotNull(res.Headers.Location);

        var note = await res.Content.ReadFromJsonAsync<NoteDto>();
        Assert.NotNull(note);
        Assert.Equal("Hello", note.Title);
        Assert.Equal("World", note.Body);
    }

    [Fact]
    public async Task GetNotes_AfterCreate_ReturnsCreatedNote()
    {
        Authorize(await RegisterAndGetTokenAsync());

        await _client.PostAsJsonAsync("/api/notes", new { title = "My Note", body = (string?)null });

        var notes = await _client.GetFromJsonAsync<List<NoteDto>>("/api/notes");
        Assert.NotNull(notes);
        Assert.Single(notes);
        Assert.Equal("My Note", notes[0].Title);
    }

    [Fact]
    public async Task SyncNotes_Returns200WithSyncedAt()
    {
        Authorize(await RegisterAndGetTokenAsync());

        var res = await _client.GetAsync("/api/notes/sync");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<SyncResponse>();
        Assert.NotNull(body);
        Assert.NotNull(body.Notes);
        Assert.True(body.SyncedAt > DateTime.UtcNow.AddMinutes(-1));
    }

    [Fact]
    public async Task UpdateNote_ValidRequest_Returns200WithUpdatedFields()
    {
        Authorize(await RegisterAndGetTokenAsync());

        var createRes = await _client.PostAsJsonAsync("/api/notes",
            new { title = "Original", body = "Original body" });
        var created = await createRes.Content.ReadFromJsonAsync<NoteDto>();

        var updateRes = await _client.PutAsJsonAsync($"/api/notes/{created!.Id}",
            new { title = "Updated", body = "Updated body" });

        Assert.Equal(HttpStatusCode.OK, updateRes.StatusCode);

        var updated = await updateRes.Content.ReadFromJsonAsync<NoteDto>();
        Assert.NotNull(updated);
        Assert.Equal("Updated", updated.Title);
        Assert.Equal("Updated body", updated.Body);
    }

    [Fact]
    public async Task DeleteNote_ValidRequest_Returns204()
    {
        Authorize(await RegisterAndGetTokenAsync());

        var createRes = await _client.PostAsJsonAsync("/api/notes",
            new { title = "To Delete", body = (string?)null });
        var created = await createRes.Content.ReadFromJsonAsync<NoteDto>();

        var deleteRes = await _client.DeleteAsync($"/api/notes/{created!.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteRes.StatusCode);

        var notes = await _client.GetFromJsonAsync<List<NoteDto>>("/api/notes");
        Assert.Empty(notes!);
    }

    [Fact]
    public async Task UpdateNote_AnotherUsersNote_Returns404()
    {
        // User A creates a note
        Authorize(await RegisterAndGetTokenAsync());
        var createRes = await _client.PostAsJsonAsync("/api/notes",
            new { title = "User A note", body = (string?)null });
        var note = await createRes.Content.ReadFromJsonAsync<NoteDto>();

        // User B tries to update it
        Authorize(await RegisterAndGetTokenAsync());
        var updateRes = await _client.PutAsJsonAsync($"/api/notes/{note!.Id}",
            new { title = "Hijacked", body = (string?)null });

        Assert.Equal(HttpStatusCode.NotFound, updateRes.StatusCode);
    }

    // ── Local DTO for sync response ───────────────────────────────────────────
    private record SyncResponse(List<NoteDto> Notes, DateTime SyncedAt);
}
