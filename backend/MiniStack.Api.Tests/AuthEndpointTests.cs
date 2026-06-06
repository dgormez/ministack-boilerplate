using System.Net;
using System.Net.Http.Json;
using MiniStack.Api.Endpoints;
using Xunit;

namespace MiniStack.Api.Tests;

public class AuthEndpointTests(MiniStackWebAppFactory factory)
    : IClassFixture<MiniStackWebAppFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string UniqueEmail() => $"user_{Guid.NewGuid():N}@test.com";

    private async Task<AuthResponse> RegisterAsync(string email, string password = "password123")
    {
        var res = await _client.PostAsJsonAsync("/api/auth/register", new { email, password });
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<AuthResponse>())!;
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Register_ValidCredentials_Returns200WithTokens()
    {
        var res = await _client.PostAsJsonAsync("/api/auth/register",
            new { email = UniqueEmail(), password = "password123" });

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(body);
        Assert.NotEmpty(body.AccessToken);
        Assert.NotEmpty(body.RefreshToken);
        Assert.NotEqual(Guid.Empty, body.User.Id);
    }

    [Fact]
    public async Task Register_DuplicateEmail_Returns409()
    {
        var email = UniqueEmail();
        await RegisterAsync(email);

        var res = await _client.PostAsJsonAsync("/api/auth/register",
            new { email, password = "password123" });

        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
    }

    [Fact]
    public async Task Login_ValidCredentials_Returns200WithTokens()
    {
        var email = UniqueEmail();
        await RegisterAsync(email);

        var res = await _client.PostAsJsonAsync("/api/auth/login",
            new { email, password = "password123" });

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(body);
        Assert.NotEmpty(body.AccessToken);
    }

    [Fact]
    public async Task Login_WrongPassword_Returns401()
    {
        var email = UniqueEmail();
        await RegisterAsync(email);

        var res = await _client.PostAsJsonAsync("/api/auth/login",
            new { email, password = "wrong-password" });

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Refresh_ValidToken_Returns200WithNewTokens()
    {
        var auth = await RegisterAsync(UniqueEmail());

        var res = await _client.PostAsJsonAsync("/api/auth/refresh",
            new { refreshToken = auth.RefreshToken });

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(body);
        Assert.NotEmpty(body.AccessToken);
        Assert.NotEqual(auth.RefreshToken, body.RefreshToken); // token rotated
    }

    [Fact]
    public async Task Refresh_InvalidToken_Returns401()
    {
        var res = await _client.PostAsJsonAsync("/api/auth/refresh",
            new { refreshToken = "not-a-real-token" });

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Logout_Authenticated_Returns204()
    {
        var auth = await RegisterAsync(UniqueEmail());
        _client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth.AccessToken);

        var res = await _client.PostAsync("/api/auth/logout", null);

        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);

        _client.DefaultRequestHeaders.Authorization = null;
    }

    [Fact]
    public async Task DeleteAccount_Authenticated_Returns204AndPreventsLogin()
    {
        var email = UniqueEmail();
        var auth  = await RegisterAsync(email);
        _client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth.AccessToken);

        var deleteRes = await _client.DeleteAsync("/api/auth/account");
        Assert.Equal(HttpStatusCode.NoContent, deleteRes.StatusCode);

        _client.DefaultRequestHeaders.Authorization = null;

        var loginRes = await _client.PostAsJsonAsync("/api/auth/login",
            new { email, password = "password123" });
        Assert.Equal(HttpStatusCode.Unauthorized, loginRes.StatusCode);
    }
}
