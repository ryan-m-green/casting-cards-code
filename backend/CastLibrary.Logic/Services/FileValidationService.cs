using Microsoft.AspNetCore.Http;
using CastLibrary.Shared.Domain;
using System.Linq;

namespace CastLibrary.Logic.Services
{
    public interface IFileValidationService
    {
        Task<FileValidationResult> ValidateFileAsync(IFormFile file, long maxSizeBytes, string[] allowedTypes);
    }

    public class FileValidationResult
    {
        public bool IsValid { get; set; }
        public string ErrorMessage { get; set; } = string.Empty;
        public string DetectedContentType { get; set; } = string.Empty;
    }

    public class FileValidationService : IFileValidationService
    {
        private static readonly Dictionary<string, byte[]> FileSignatures = new()
        {
            { "image/jpeg", new byte[] { 0xFF, 0xD8, 0xFF } },
            { "image/png", new byte[] { 0x89, 0x50, 0x4E, 0x47 } },
            { "image/webp", new byte[] { 0x52, 0x49, 0x46, 0x46 } }, // RIFF header
            { "application/pdf", new byte[] { 0x25, 0x50, 0x44, 0x46 } },
            { "audio/mpeg", new byte[] { 0xFF, 0xFB } }, // MP3
            { "audio/wav", new byte[] { 0x52, 0x49, 0x46, 0x46 } }, // RIFF header (WAV)
            { "audio/ogg", new byte[] { 0x4F, 0x67, 0x67, 0x53 } }, // OggS
            { "audio/mp4", new byte[] { 0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70 } }, // M4A (ftyp)
            { "audio/flac", new byte[] { 0x66, 0x4C, 0x61, 0x43 } } // fLaC
        };

        public async Task<FileValidationResult> ValidateFileAsync(IFormFile file, long maxSizeBytes, string[] allowedTypes)
        {
            if (file == null || file.Length == 0)
                return new FileValidationResult { IsValid = false, ErrorMessage = "No file provided." };

            if (file.Length > maxSizeBytes)
                return new FileValidationResult { IsValid = false, ErrorMessage = $"File size exceeds {maxSizeBytes / (1024 * 1024)}MB limit." };

            if (string.IsNullOrWhiteSpace(file.FileName))
                return new FileValidationResult { IsValid = false, ErrorMessage = "File name is required." };

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            var expectedContentType = GetExpectedContentType(extension);
            
            if (!allowedTypes.Contains(expectedContentType))
                return new FileValidationResult { IsValid = false, ErrorMessage = "File type not allowed." };

            // Verify file signature
            using var stream = file.OpenReadStream();
            var header = new byte[12]; // Read 12 bytes for WebP validation
            var bytesRead = await stream.ReadAsync(header, 0, header.Length);
            
            if (bytesRead < 4) // Minimum signature length
                return new FileValidationResult { IsValid = false, ErrorMessage = "File is too small to be valid." };
            
            if (!IsValidFileSignature(header, expectedContentType, bytesRead))
                return new FileValidationResult { IsValid = false, ErrorMessage = "File signature does not match extension." };

            return new FileValidationResult { IsValid = true, DetectedContentType = expectedContentType };
        }

        private bool IsValidFileSignature(byte[] header, string contentType, int bytesRead)
        {
            if (!FileSignatures.TryGetValue(contentType, out var signature))
                return false;

            // Basic signature check
            if (bytesRead < signature.Length || !header.Take(signature.Length).SequenceEqual(signature))
            {
                // Special case for MP3: check for ID3v2 tag
                if (contentType == "audio/mpeg" && bytesRead >= 3)
                {
                    var id3Tag = new byte[] { 0x49, 0x44, 0x33 }; // "ID3"
                    if (header.Take(3).SequenceEqual(id3Tag))
                        return true;
                }
                
                return false;
            }

            // Additional validation for WebP files
            if (contentType == "image/webp")
            {
                // WebP files should have "RIFF" at start and "WEBP" at bytes 8-11
                if (bytesRead < 12)
                    return false;
                
                // Check for "WEBP" identifier at bytes 8-11
                var webpIdentifier = new byte[] { 0x57, 0x45, 0x42, 0x50 }; // "WEBP"
                if (!header.Skip(8).Take(4).SequenceEqual(webpIdentifier))
                    return false;
            }

            // Additional validation for WAV files
            if (contentType == "audio/wav")
            {
                // WAV files should have "RIFF" at start and "WAVE" at bytes 8-11
                if (bytesRead < 12)
                    return false;
                
                // Check for "WAVE" identifier at bytes 8-11
                var waveIdentifier = new byte[] { 0x57, 0x41, 0x56, 0x45 }; // "WAVE"
                if (!header.Skip(8).Take(4).SequenceEqual(waveIdentifier))
                    return false;
            }

            return true;
        }

        private string GetExpectedContentType(string extension)
        {
            return extension switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".webp" => "image/webp",
                ".pdf" => "application/pdf",
                ".mp3" => "audio/mpeg",
                ".wav" or ".wave" => "audio/wav",
                ".ogg" => "audio/ogg",
                ".m4a" => "audio/mp4",
                ".flac" => "audio/flac",
                _ => "unknown"
            };
        }
    }
}
