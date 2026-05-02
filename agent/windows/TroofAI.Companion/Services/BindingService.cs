using System.Net;
using System.Text;
using System.Text.Json;

namespace TroofAI.Companion.Services;

/// <summary>
/// Listens on localhost:9876/bind for join_token binding requests from the dashboard.
/// Signs the join_token with the device's private key and returns the signature.
/// Per SPEC.md section 3b-3c.
/// </summary>
public class BindingService
{
    private readonly ChallengeSigningService _challengeSigner;
    private readonly EnrollmentService _enrollment;
    private HttpListener? _listener;
    private CancellationTokenSource? _cts;

    public BindingService(ChallengeSigningService challengeSigner, EnrollmentService enrollment)
    {
        _challengeSigner = challengeSigner;
        _enrollment = enrollment;
    }

    public async Task StartAsync()
    {
        _cts = new CancellationTokenSource();
        _listener = new HttpListener();
        _listener.Prefixes.Add("http://localhost:9876/");
        _listener.Start();

        Console.WriteLine("  [Binding] Listening on http://localhost:9876/bind");

        _ = Task.Run(async () =>
        {
            while (!_cts.Token.IsCancellationRequested)
            {
                try
                {
                    var context = await _listener.GetContextAsync();
                    _ = HandleRequestAsync(context);
                }
                catch (Exception ex) when (!_cts.Token.IsCancellationRequested)
                {
                    Console.WriteLine($"  [Binding] Listener error: {ex.Message}");
                }
            }
        });
    }

    private async Task HandleRequestAsync(HttpListenerContext context)
    {
        // Add CORS headers for Next.js on localhost:3000
        context.Response.Headers.Add("Access-Control-Allow-Origin", "*");
        context.Response.Headers.Add("Access-Control-Allow-Methods", "POST, OPTIONS");
        context.Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");

        if (context.Request.HttpMethod == "OPTIONS")
        {
            context.Response.StatusCode = 200;
            context.Response.Close();
            return;
        }

        if (context.Request.HttpMethod != "POST" || context.Request.Url?.AbsolutePath != "/bind")
        {
            await RespondJson(context.Response, 404, new { error = "Not found" });
            return;
        }

        try
        {
            using var reader = new StreamReader(context.Request.InputStream);
            var body = await reader.ReadToEndAsync();
            var json = JsonSerializer.Deserialize<JsonElement>(body);

            var joinToken = json.GetProperty("join_token").GetString()!;
            var meetingId = json.GetProperty("meeting_id").GetString()!;
            var participantId = json.GetProperty("participant_id").GetString()!;
            var expiresAt = json.GetProperty("expires_at").GetString()!;

            Console.WriteLine($"\n  ╔══════════════════════════════════════════╗");
            Console.WriteLine($"  ║  BINDING REQUEST                         ║");
            Console.WriteLine($"  ║  Meeting:     {meetingId[..8]}...              ║");
            Console.WriteLine($"  ║  Participant: {participantId[..8]}...              ║");
            Console.WriteLine($"  ╚══════════════════════════════════════════╝");

            // Sign per SPEC.md section 3c
            var signature = _challengeSigner.SignBinding(joinToken, meetingId, participantId, expiresAt);

            var response = new
            {
                join_token = joinToken,
                device_id = _enrollment.DeviceId,
                signature = signature,
            };

            Console.WriteLine("  [Binding] Signed and returned ✓");
            await RespondJson(context.Response, 200, response);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [Binding] ERROR: {ex.Message}");
            await RespondJson(context.Response, 400, new { error = ex.Message });
        }
    }

    private async Task RespondJson(HttpListenerResponse response, int statusCode, object data)
    {
        response.StatusCode = statusCode;
        response.ContentType = "application/json";
        var json = JsonSerializer.Serialize(data);
        var bytes = Encoding.UTF8.GetBytes(json);
        response.ContentLength64 = bytes.Length;
        await response.OutputStream.WriteAsync(bytes);
        response.Close();
    }

    public void Stop()
    {
        _cts?.Cancel();
        _listener?.Stop();
        _listener?.Close();
    }
}
