using System.Text;
using System.Text.Json;

namespace TroofAI.Companion.Services;

/// <summary>
/// Signs challenge payloads per SPEC.md section 4b.
/// Constructs the deterministic newline-delimited signing string
/// and signs with RSA-SHA256.
/// </summary>
public class ChallengeSigningService
{
    private readonly KeyService _keyService;
    private readonly EnrollmentService _enrollment;

    public ChallengeSigningService(KeyService keyService, EnrollmentService enrollment)
    {
        _keyService = keyService;
        _enrollment = enrollment;
    }

    /// <summary>
    /// Signs a challenge per SPEC.md section 4b:
    /// troofai-v1\n{challenge_id}\n{tenant_id}\n{device_id}\n{user_id}\n{meeting_id}\n{participant_id}\n{nonce}\n{issued_at}\n{expires_at}
    /// </summary>
    public string SignChallenge(
        string challengeId,
        string meetingId,
        string participantId,
        string nonce,
        string issuedAt,
        string expiresAt)
    {
        // Construct canonical signing string per SPEC.md
        var lines = new[]
        {
            "troofai-v1",
            challengeId,
            _enrollment.TenantId ?? "",
            _enrollment.DeviceId ?? "",
            _enrollment.UserId ?? "",
            meetingId,
            participantId,
            nonce,
            issuedAt,
            expiresAt
        };

        var signingString = string.Join("\n", lines);
        var signature = _keyService.Sign(signingString);

        Console.WriteLine($"  [Challenge] Signed challenge {challengeId[..8]}...");
        Console.WriteLine($"    Meeting:     {meetingId[..8]}...");
        Console.WriteLine($"    Participant: {participantId[..8]}...");

        return signature;
    }

    /// <summary>
    /// Signs a join_token binding per SPEC.md section 3c:
    /// {join_token}\n{meeting_id}\n{participant_id}\n{device_id}\n{expires_at}
    /// </summary>
    public string SignBinding(string joinToken, string meetingId, string participantId, string expiresAt)
    {
        var lines = new[]
        {
            joinToken,
            meetingId,
            participantId,
            _enrollment.DeviceId ?? "",
            expiresAt
        };

        var signingString = string.Join("\n", lines);
        return _keyService.Sign(signingString);
    }
}
