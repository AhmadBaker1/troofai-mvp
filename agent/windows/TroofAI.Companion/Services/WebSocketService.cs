using SocketIOClient;
using System.Text.Json;

namespace TroofAI.Companion.Services;

/// <summary>
/// Maintains a persistent Socket.IO connection to the TroofAI Hub.
/// Handles device registration, heartbeat, and challenge routing.
/// </summary>
public class WebSocketService
{
    private readonly string _hubUrl;
    private readonly EnrollmentService _enrollment;
    private readonly ChallengeSigningService _challengeSigner;
    private SocketIOClient.SocketIO? _socket;
    private Timer? _heartbeatTimer;

    public bool IsConnected => _socket?.Connected ?? false;

    public WebSocketService(string hubUrl, EnrollmentService enrollment, ChallengeSigningService challengeSigner)
    {
        _hubUrl = hubUrl.TrimEnd('/');
        _enrollment = enrollment;
        _challengeSigner = challengeSigner;
    }

    public async Task ConnectAsync()
    {
        _socket = new SocketIOClient.SocketIO(_hubUrl, new SocketIOOptions
        {
            Reconnection = true,
            ReconnectionAttempts = int.MaxValue,
            ReconnectionDelay = 1000,
        });

        _socket.OnConnected += async (sender, e) =>
        {
            Console.WriteLine("  [WS] Connected to TroofAI Hub");

            // Register device
            await _socket.EmitAsync("device:connect", new { device_id = _enrollment.DeviceId });
            Console.WriteLine($"  [WS] Device registered: {_enrollment.DeviceId}");

            // Start heartbeat
            StartHeartbeat();
        };

        _socket.OnDisconnected += (sender, e) =>
        {
            Console.WriteLine("  [WS] Disconnected from Hub — will reconnect...");
            StopHeartbeat();
        };

        _socket.OnReconnectAttempt += (sender, attempt) =>
        {
            Console.WriteLine($"  [WS] Reconnecting (attempt {attempt})...");
        };

        // Listen for challenges from Hub
        _socket.On("challenge:issue", async response =>
        {
            try
            {
                var json = response.GetValue<JsonElement>(0);
                var challengeId = json.GetProperty("challenge_id").GetString()!;
                var nonce = json.GetProperty("nonce").GetString()!;
                var meetingId = json.GetProperty("meeting_id").GetString()!;
                var participantId = json.GetProperty("participant_id").GetString()!;
                var issuedAt = json.GetProperty("issued_at").GetString()!;
                var expiresAt = json.GetProperty("expires_at").GetString()!;

                Console.WriteLine($"\n  ╔══════════════════════════════════════════╗");
                Console.WriteLine($"  ║  CHALLENGE RECEIVED                      ║");
                Console.WriteLine($"  ║  Challenge: {challengeId[..8]}...              ║");
                Console.WriteLine($"  ╚══════════════════════════════════════════╝");

                // Sign the challenge
                var signature = _challengeSigner.SignChallenge(
                    challengeId, meetingId, participantId, nonce, issuedAt, expiresAt);

                // Send response
                await _socket.EmitAsync("challenge:response", new
                {
                    challenge_id = challengeId,
                    device_id = _enrollment.DeviceId,
                    signature = signature,
                });

                Console.WriteLine("  [Challenge] Response sent ✓");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [Challenge] ERROR signing: {ex.Message}");
            }
        });

        // Listen for challenge result
        _socket.On("challenge:result", response =>
        {
            try
            {
                var json = response.GetValue<JsonElement>(0);
                Console.WriteLine($"  [Challenge] Result: {json}");
            }
            catch { }
        });

        Console.WriteLine($"  [WS] Connecting to {_hubUrl}...");
        await _socket.ConnectAsync();
    }

    private void StartHeartbeat()
    {
        _heartbeatTimer = new Timer(async _ =>
        {
            try
            {
                if (_socket?.Connected == true)
                {
                    await _socket.EmitAsync("device:heartbeat", new { device_id = _enrollment.DeviceId });
                }
            }
            catch { }
        }, null, TimeSpan.FromSeconds(30), TimeSpan.FromSeconds(60));
    }

    private void StopHeartbeat()
    {
        _heartbeatTimer?.Dispose();
        _heartbeatTimer = null;
    }

    public async Task DisconnectAsync()
    {
        StopHeartbeat();
        if (_socket != null)
        {
            await _socket.DisconnectAsync();
            _socket.Dispose();
        }
    }
}
