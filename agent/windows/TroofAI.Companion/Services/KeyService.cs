using System.Security.Cryptography;
using System.Text;

namespace TroofAI.Companion.Services;

/// <summary>
/// Manages RSA-2048 key generation, storage, and signing.
/// Attempts hardware-backed key via CNG Platform Crypto Provider (TPM).
/// Falls back to software-backed CNG key if TPM is unavailable.
/// </summary>
public class KeyService
{
    private const string KeyName = "TroofAI-DeviceKey";
    private RSA? _rsa;
    private bool _hardwareBound;

    public bool HardwareBound => _hardwareBound;

    public void Initialize()
    {
        // Try to open existing key first
        if (TryLoadExistingKey())
        {
            Console.WriteLine($"  [Key] Loaded existing key: {KeyName} (hardware={_hardwareBound})");
            return;
        }

        // Try hardware-backed key (TPM via Platform Crypto Provider)
        try
        {
            var keyParams = new CngKeyCreationParameters
            {
                Provider = CngProvider.MicrosoftPlatformCryptoProvider,
                KeyCreationOptions = CngKeyCreationOptions.None,
                ExportPolicy = CngExportPolicies.None,
            };
            keyParams.Parameters.Add(new CngProperty("Length", BitConverter.GetBytes(2048), CngPropertyOptions.None));

            var cngKey = CngKey.Create(CngAlgorithm.Rsa, KeyName, keyParams);
            _rsa = new RSACng(cngKey);
            _hardwareBound = true;
            Console.WriteLine("  [Key] Created hardware-backed key (TPM/Platform Crypto Provider)");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [Key] TPM not available ({ex.Message}), falling back to software key");

            // Fallback: software-backed RSA key
            _rsa = RSA.Create(2048);
            _hardwareBound = false;
            Console.WriteLine("  [Key] Created software-backed RSA-2048 key");
        }
    }

    private bool TryLoadExistingKey()
    {
        try
        {
            if (CngKey.Exists(KeyName, CngProvider.MicrosoftPlatformCryptoProvider))
            {
                var cngKey = CngKey.Open(KeyName, CngProvider.MicrosoftPlatformCryptoProvider);
                _rsa = new RSACng(cngKey);
                _hardwareBound = true;
                return true;
            }
        }
        catch { /* TPM key not found */ }

        try
        {
            if (CngKey.Exists(KeyName))
            {
                var cngKey = CngKey.Open(KeyName);
                _rsa = new RSACng(cngKey);
                _hardwareBound = false;
                return true;
            }
        }
        catch { /* Software key not found */ }

        return false;
    }

    /// <summary>
    /// Exports the public key in PEM format (SubjectPublicKeyInfo).
    /// </summary>
    public string GetPublicKeyPem()
    {
        if (_rsa == null) throw new InvalidOperationException("Key not initialized");

        var pubKeyBytes = _rsa.ExportSubjectPublicKeyInfo();
        var base64 = Convert.ToBase64String(pubKeyBytes, Base64FormattingOptions.InsertLineBreaks);
        return $"-----BEGIN PUBLIC KEY-----\n{base64}\n-----END PUBLIC KEY-----";
    }

    /// <summary>
    /// Signs data with RSA-SHA256 (PKCS#1 v1.5 padding).
    /// Returns base64-encoded signature.
    /// </summary>
    public string Sign(string data)
    {
        if (_rsa == null) throw new InvalidOperationException("Key not initialized");

        var dataBytes = Encoding.UTF8.GetBytes(data);
        var signature = _rsa.SignData(dataBytes, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        return Convert.ToBase64String(signature);
    }

    /// <summary>
    /// Signs data with RSA-SHA256. Returns base64-encoded signature.
    /// </summary>
    public string Sign(byte[] data)
    {
        if (_rsa == null) throw new InvalidOperationException("Key not initialized");

        var signature = _rsa.SignData(data, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        return Convert.ToBase64String(signature);
    }
}
