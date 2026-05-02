using TroofAI.Companion.Services;

namespace TroofAI.Companion;

class Program
{
    // Configuration — edit these for your demo
    private const string HUB_URL = "http://localhost:3001";
    private const string USER_ID = "alice@troofai.com";
    private const string DISPLAY_NAME = "Alice Baker";

    static async Task Main(string[] args)
    {
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine(@"
  ╔══════════════════════════════════════════════════════╗
  ║                                                      ║
  ║   TroofAI Companion Agent v1.0                       ║
  ║   Cryptographic Trust Layer for Meetings             ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
");
        Console.ResetColor();

        // Step 1: Fetch tenant ID from Hub
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine("  ── Step 1: Fetching Tenant ID ──");
        Console.ResetColor();

        string tenantId;
        try
        {
            var http = new HttpClient { BaseAddress = new Uri(HUB_URL) };
            // The Hub auto-creates a demo tenant on startup.
            // For the MVP, we'll use a simple approach: get all tenants
            // Actually, let's use the device endpoint to get the tenant dynamically
            // For now, we'll read it from config or use a known API key
            tenantId = await GetTenantIdAsync(HUB_URL);
            Console.WriteLine($"  Tenant ID: {tenantId}");
        }
        catch (Exception ex)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"  ERROR: Cannot connect to Hub at {HUB_URL}");
            Console.WriteLine($"  {ex.Message}");
            Console.WriteLine("  Make sure the Hub API is running first!");
            Console.ResetColor();
            return;
        }

        // Step 2: Initialize key service
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine("\n  ── Step 2: Key Generation ──");
        Console.ResetColor();

        var keyService = new KeyService();
        keyService.Initialize();

        // Step 3: Enroll device
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine("\n  ── Step 3: Device Enrollment ──");
        Console.ResetColor();

        var enrollment = new EnrollmentService(keyService, HUB_URL);
        var enrolled = await enrollment.EnrollAsync(tenantId, USER_ID, DISPLAY_NAME);
        if (!enrolled)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("  Enrollment failed. Exiting.");
            Console.ResetColor();
            return;
        }

        // Step 4: Start challenge signing service
        var challengeSigner = new ChallengeSigningService(keyService, enrollment);

        // Step 5: Start binding listener
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine("\n  ── Step 4: Starting Binding Listener ──");
        Console.ResetColor();

        var binding = new BindingService(challengeSigner, enrollment);
        await binding.StartAsync();

        // Step 6: Connect WebSocket
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine("\n  ── Step 5: Connecting to Hub ──");
        Console.ResetColor();

        var ws = new WebSocketService(HUB_URL, enrollment, challengeSigner);
        await ws.ConnectAsync();

        // Wait for connection
        await Task.Delay(1000);

        // Ready
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine(@"
  ╔══════════════════════════════════════════════════════╗
  ║                                                      ║
  ║   ✓ TroofAI Companion Agent READY                    ║
  ║                                                      ║
  ║   Device:  " + (enrollment.DeviceId?[..8] ?? "unknown") + @"...                         ║
  ║   User:    " + USER_ID.PadRight(37) + @"  ║
  ║   HW Key:  " + (keyService.HardwareBound ? "Yes (TPM)" : "No (software)").PadRight(37) + @"  ║
  ║   Hub:     " + (ws.IsConnected ? "Connected ✓" : "Connecting...").PadRight(37) + @"  ║
  ║                                                      ║
  ║   Waiting for challenges...                          ║
  ║   Press Ctrl+C to exit.                              ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
");
        Console.ResetColor();

        // Keep running
        var cts = new CancellationTokenSource();
        Console.CancelKeyPress += (_, e) =>
        {
            e.Cancel = true;
            cts.Cancel();
        };

        try
        {
            await Task.Delay(Timeout.Infinite, cts.Token);
        }
        catch (OperationCanceledException) { }

        Console.WriteLine("\n  Shutting down...");
        binding.Stop();
        await ws.DisconnectAsync();
        Console.WriteLine("  Goodbye!");
    }

    /// <summary>
    /// Gets the demo tenant ID from the Hub by querying the first available tenant.
    /// In production, this would use proper auth. For the MVP, we use a simple endpoint.
    /// </summary>
    private static async Task<string> GetTenantIdAsync(string hubUrl)
    {
        var http = new HttpClient { BaseAddress = new Uri(hubUrl) };

        // Try to get tenant info. The Hub prints the tenant ID on startup.
        // For the MVP, we'll add a simple /health endpoint,
        // or we just use the tenant_id from a known API key.
        // Simplest approach: add a /tenants/demo endpoint.

        // For now, read from local config or env
        var configPath = Path.Combine(AppContext.BaseDirectory, "troofai-device.json");
        if (File.Exists(configPath))
        {
            var json = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(File.ReadAllText(configPath));
            if (json.TryGetProperty("TenantId", out var tid) && tid.GetString() is string t && !string.IsNullOrEmpty(t))
                return t;
        }

        // Fallback: ask user for the tenant ID
        Console.Write("  Enter Tenant ID (from Hub startup log): ");
        var input = Console.ReadLine()?.Trim();
        if (string.IsNullOrEmpty(input))
            throw new Exception("Tenant ID is required");
        return input;
    }
}
