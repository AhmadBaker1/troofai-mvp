using System.Net.Http.Json;
using System.Text.Json;

namespace TroofAI.Companion.Services;

/// <summary>
/// Handles device enrollment with the TroofAI Hub.
/// On first run: generates key, enrolls with Hub, stores device_id.
/// On subsequent runs: loads existing config and re-enrolls to refresh public key.
/// </summary>
public class EnrollmentService
{
    private readonly KeyService _keyService;
    private readonly HttpClient _http;
    private readonly string _hubUrl;
    private readonly string _configPath;

    public string? DeviceId { get; private set; }
    public string? TenantId { get; private set; }
    public string? UserId { get; private set; }
    public string? DisplayName { get; private set; }

    public EnrollmentService(KeyService keyService, string hubUrl)
    {
        _keyService = keyService;
        _hubUrl = hubUrl.TrimEnd('/');
        _http = new HttpClient { BaseAddress = new Uri(_hubUrl) };
        _configPath = Path.Combine(AppContext.BaseDirectory, "troofai-device.json");
    }

    public async Task<bool> EnrollAsync(string tenantId, string userId, string displayName)
    {
        TenantId = tenantId;
        UserId = userId;
        DisplayName = displayName;

        // Load or generate device ID
        var config = LoadConfig();
        DeviceId = config?.DeviceId ?? Guid.NewGuid().ToString();

        // Initialize key service
        _keyService.Initialize();

        var publicKeyPem = _keyService.GetPublicKeyPem();

        // Call Hub enrollment endpoint
        var payload = new
        {
            tenant_id = TenantId,
            device_id = DeviceId,
            user_id = UserId,
            display_name = DisplayName,
            public_key_pem = publicKeyPem,
            key_algorithm = "RSA-2048",
            hardware_bound = _keyService.HardwareBound,
            agent_version = "1.0.0"
        };

        try
        {
            var response = await _http.PostAsJsonAsync("/devices/enroll", payload);
            var body = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                // Save config locally
                SaveConfig(new DeviceConfig { DeviceId = DeviceId, TenantId = TenantId, UserId = UserId });

                Console.WriteLine($"  [Enrollment] Device enrolled successfully");
                Console.WriteLine($"    Device ID:      {DeviceId}");
                Console.WriteLine($"    Hardware-bound:  {_keyService.HardwareBound}");
                Console.WriteLine($"    User:           {UserId}");
                return true;
            }
            else
            {
                Console.WriteLine($"  [Enrollment] FAILED: {response.StatusCode} — {body}");
                return false;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [Enrollment] Connection error: {ex.Message}");
            return false;
        }
    }

    private DeviceConfig? LoadConfig()
    {
        if (!File.Exists(_configPath)) return null;
        var json = File.ReadAllText(_configPath);
        return JsonSerializer.Deserialize<DeviceConfig>(json);
    }

    private void SaveConfig(DeviceConfig config)
    {
        var json = JsonSerializer.Serialize(config, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(_configPath, json);
    }

    private class DeviceConfig
    {
        public string DeviceId { get; set; } = "";
        public string TenantId { get; set; } = "";
        public string UserId { get; set; } = "";
    }
}
