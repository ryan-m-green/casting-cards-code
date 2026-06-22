using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using CastLibrary.Adapter.Operators;
using CastLibrary.Adapter.ImageConversion;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Configuration;
using System.Diagnostics;

var configuration = new ConfigurationBuilder()
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
    .AddEnvironmentVariables()
    .Build();

var serviceProvider = new ServiceCollection()
    .AddSingleton<IConfiguration>(configuration)
    .AddSingleton<IFileStorageConfiguration>(sp => 
    {
        var config = sp.GetRequiredService<IConfiguration>();
        return new FileStorageConfiguration(config);
    })
    .AddSingleton<IImageConverter, ImageConverter>()
    .AddSingleton<IImageStorageOperator, FileImageStorageOperator>()
    .BuildServiceProvider();

var commands = Environment.GetCommandLineArgs();
if (commands.Length < 2)
{
    Console.WriteLine("Usage: dotnet run -- <command> [options]");
    Console.WriteLine("Commands:");
    Console.WriteLine("  fetch --output <directory>    Download all images from Spaces to local directory");
    Console.WriteLine("  convert --input <directory> --output <directory>  Process images through ImageConverter");
    Console.WriteLine("  upload --input <directory>    Upload converted images back to Spaces");
    Console.WriteLine("  validate                     Validate uploaded image sizes");
    return 1;
}

var command = commands[1].ToLower();

try
{
    var imageStorage = serviceProvider.GetRequiredService<IImageStorageOperator>();
    var imageConverter = serviceProvider.GetRequiredService<IImageConverter>();

    switch (command)
    {
        case "fetch":
            await FetchCommand(imageStorage, args);
            break;
        case "convert":
            await ConvertCommand(imageConverter, args);
            break;
        case "upload":
            await UploadCommand(imageStorage, args);
            break;
        case "validate":
            await ValidateCommand(imageStorage);
            break;
        default:
            Console.WriteLine($"Unknown command: {command}");
            return 1;
    }

    return 0;
}
catch (Exception ex)
{
    Console.WriteLine($"Error: {ex.Message}");
    Console.WriteLine(ex.StackTrace);
    return 1;
}

static async Task FetchCommand(IImageStorageOperator imageStorage, string[] args)
{
    var outputDir = GetOption(args, "--output") ?? @"C:\Repository\CastingCards\ImageFixes\Source";
    Directory.CreateDirectory(outputDir);

    Console.WriteLine($"Fetching images to: {outputDir}");
    var stopwatch = Stopwatch.StartNew();

    var images = await imageStorage.ListAllImagesWithSizesAsync();
    var imageKeys = images.Select(i => i.key).ToList();
    Console.WriteLine($"Found {imageKeys.Count} images");

    var successCount = 0;
    var errorCount = 0;

    foreach (var key in imageKeys)
    {
        try
        {
            var bytes = await imageStorage.ReadAsync(key);
            if (bytes != null)
            {
                var localPath = Path.Combine(outputDir, key.Replace('/', Path.DirectorySeparatorChar));
                Directory.CreateDirectory(Path.GetDirectoryName(localPath)!);
                await File.WriteAllBytesAsync(localPath, bytes);
                successCount++;
                Console.Write($"\rProgress: {successCount}/{imageKeys.Count}  ");
            }
            else
            {
                errorCount++;
                Console.WriteLine($"\nFailed to read: {key}");
            }
        }
        catch (Exception ex)
        {
            errorCount++;
            Console.WriteLine($"\nError processing {key}: {ex.Message}");
        }
    }

    stopwatch.Stop();
    Console.WriteLine($"\n\nFetch complete:");
    Console.WriteLine($"  Total images: {imageKeys.Count}");
    Console.WriteLine($"  Success: {successCount}");
    Console.WriteLine($"  Errors: {errorCount}");
    Console.WriteLine($"  Time: {stopwatch.Elapsed.TotalSeconds:F2}s");
}

static async Task ConvertCommand(IImageConverter imageConverter, string[] args)
{
    var inputDir = GetOption(args, "--input") ?? @"C:\Repository\CastingCards\ImageFixes\Source";
    var outputDir = GetOption(args, "--output") ?? @"C:\Repository\CastingCards\ImageFixes\Destination";

    if (!Directory.Exists(inputDir))
    {
        Console.WriteLine($"Input directory does not exist: {inputDir}");
        return;
    }

    Directory.CreateDirectory(outputDir);

    Console.WriteLine($"Converting images from: {inputDir}");
    Console.WriteLine($"Output directory: {outputDir}");
    var stopwatch = Stopwatch.StartNew();

    var allFiles = Directory.GetFiles(inputDir, "*", SearchOption.AllDirectories);
    Console.WriteLine($"Found {allFiles.Length} files");

    // Check for duplicate output paths
    var outputPaths = new Dictionary<string, List<string>>();
    foreach (var file in allFiles)
    {
        var relativePath = Path.GetRelativePath(inputDir, file);
        var outputPath = Path.Combine(outputDir, relativePath);
        outputPath = Path.ChangeExtension(outputPath, ".png");

        if (!outputPaths.ContainsKey(outputPath))
        {
            outputPaths[outputPath] = new List<string>();
        }
        outputPaths[outputPath].Add(file);
    }

    var duplicates = outputPaths.Where(kvp => kvp.Value.Count > 1).ToList();
    if (duplicates.Any())
    {
        Console.WriteLine($"WARNING: Found {duplicates.Count} duplicate output paths:");
        foreach (var kvp in duplicates.Take(10))
        {
            Console.WriteLine($"  {kvp.Key} <- {string.Join(", ", kvp.Value.Select(Path.GetFileName))}");
        }
        if (duplicates.Count > 10)
        {
            Console.WriteLine($"  ... and {duplicates.Count - 10} more");
        }
    }

    var convertedCount = 0;
    var skippedCount = 0;
    var errorCount = 0;
    var totalOriginalSize = 0L;
    var totalFinalSize = 0L;

    foreach (var file in allFiles)
    {
        try
        {
            var originalBytes = await File.ReadAllBytesAsync(file);
            totalOriginalSize += originalBytes.Length;

            using var inputStream = new MemoryStream(originalBytes);
            var convertedStream = await imageConverter.ConvertToPng(inputStream);
            var convertedBytes = ((MemoryStream)convertedStream).ToArray();

            var relativePath = Path.GetRelativePath(inputDir, file);
            var outputPath = Path.Combine(outputDir, relativePath);
            outputPath = Path.ChangeExtension(outputPath, ".png");
            Directory.CreateDirectory(Path.GetDirectoryName(outputPath)!);

            byte[] finalBytes;
            string status;

            if (convertedBytes.Length < originalBytes.Length)
            {
                // Conversion reduced size - use converted version
                finalBytes = convertedBytes;
                status = "converted";
                convertedCount++;
            }
            else
            {
                // Conversion didn't reduce size - use original
                finalBytes = originalBytes;
                status = "skipped";
                skippedCount++;
            }

            totalFinalSize += finalBytes.Length;
            File.WriteAllBytes(outputPath, finalBytes);

            var reduction = originalBytes.Length > 0 ? (1 - (double)finalBytes.Length / originalBytes.Length) * 100 : 0;
            Console.Write($"\rProgress: {convertedCount + skippedCount + 1}/{allFiles.Length}  {status}  Size reduction: {reduction:F1}%  ");
        }
        catch (Exception ex)
        {
            errorCount++;
            Console.WriteLine($"\nError processing {file}: {ex.Message}");
        }
    }

    Console.WriteLine($"\nProcessed {convertedCount + skippedCount} files, {errorCount} errors");

    stopwatch.Stop();
    var totalReduction = totalOriginalSize > 0 ? (1 - (double)totalFinalSize / totalOriginalSize) * 100 : 0;

    Console.WriteLine($"\n\nConversion complete:");
    Console.WriteLine($"  Total images: {allFiles.Length}");
    Console.WriteLine($"  Converted: {convertedCount}");
    Console.WriteLine($"  Skipped (no size reduction): {skippedCount}");
    Console.WriteLine($"  Errors: {errorCount}");
    Console.WriteLine($"  Original size: {totalOriginalSize / 1024.0 / 1024.0:F2} MB");
    Console.WriteLine($"  Final size: {totalFinalSize / 1024.0 / 1024.0:F2} MB");
    Console.WriteLine($"  Total reduction: {totalReduction:F2}%");
    Console.WriteLine($"  Time: {stopwatch.Elapsed.TotalSeconds:F2}s");
}

static async Task UploadCommand(IImageStorageOperator imageStorage, string[] args)
{
    var inputDir = GetOption(args, "--input") ?? @"C:\Repository\CastingCards\ImageFixes\Destination";

    if (!Directory.Exists(inputDir))
    {
        Console.WriteLine($"Input directory does not exist: {inputDir}");
        return;
    }

    Console.WriteLine($"Uploading images from: {inputDir}");
    var stopwatch = Stopwatch.StartNew();

    var allFiles = Directory.GetFiles(inputDir, "*", SearchOption.AllDirectories);
    Console.WriteLine($"Found {allFiles.Length} files to upload");

    var successCount = 0;
    var errorCount = 0;

    foreach (var file in allFiles)
    {
        try
        {
            var relativePath = Path.GetRelativePath(inputDir, file);
            var key = relativePath.Replace(Path.DirectorySeparatorChar, '/');

            var bytes = await File.ReadAllBytesAsync(file);
            using var stream = new MemoryStream(bytes);
            await imageStorage.SaveAsync(key, stream, "image/png");

            successCount++;
            Console.Write($"\rProgress: {successCount}/{allFiles.Length}  ");
        }
        catch (Exception ex)
        {
            errorCount++;
            Console.WriteLine($"\nError uploading {file}: {ex.Message}");
        }
    }

    stopwatch.Stop();
    Console.WriteLine($"\n\nUpload complete:");
    Console.WriteLine($"  Total images: {allFiles.Length}");
    Console.WriteLine($"  Success: {successCount}");
    Console.WriteLine($"  Errors: {errorCount}");
    Console.WriteLine($"  Time: {stopwatch.Elapsed.TotalSeconds:F2}s");
}

static async Task ValidateCommand(IImageStorageOperator imageStorage)
{
    const long maxExpectedSize = 100 * 1024; // 100KB max expected size

    Console.WriteLine("Validating uploaded image sizes...");
    var stopwatch = Stopwatch.StartNew();

    var images = await imageStorage.ListAllImagesWithSizesAsync();
    Console.WriteLine($"Found {images.Count} images");

    var sizes = images.Select(i => i.size).ToList();
    var oversizedFiles = images.Where(i => i.size > maxExpectedSize).ToList();

    stopwatch.Stop();

    if (sizes.Count == 0)
    {
        Console.WriteLine("\nNo images found to validate.");
        return;
    }

    var totalSize = sizes.Sum();
    var averageSize = sizes.Average();
    var minSize = sizes.Min();
    var maxSize = sizes.Max();
    var sortedSizes = sizes.OrderBy(s => s).ToList();
    var medianSize = sortedSizes.Count % 2 == 0
        ? (sortedSizes[sortedSizes.Count / 2 - 1] + sortedSizes[sortedSizes.Count / 2]) / 2.0
        : sortedSizes[sortedSizes.Count / 2];

    var withinLimitCount = sizes.Count(s => s <= maxExpectedSize);

    Console.WriteLine($"\n\nValidation complete:");
    Console.WriteLine($"  Total images: {sizes.Count}");
    Console.WriteLine($"  Within size limit ({maxExpectedSize / 1024}KB): {withinLimitCount}");
    Console.WriteLine($"  Exceeding size limit: {oversizedFiles.Count}");
    Console.WriteLine($"  Total size: {totalSize / 1024.0 / 1024.0:F2} MB");
    Console.WriteLine($"  Average size: {averageSize / 1024.0:F2} KB");
    Console.WriteLine($"  Min size: {minSize / 1024.0:F2} KB");
    Console.WriteLine($"  Max size: {maxSize / 1024.0:F2} KB");
    Console.WriteLine($"  Median size: {medianSize / 1024.0:F2} KB");
    Console.WriteLine($"  Time: {stopwatch.Elapsed.TotalSeconds:F2}s");

    if (oversizedFiles.Count > 0)
    {
        Console.WriteLine("\nOversized files:");
        foreach (var (key, size) in oversizedFiles.OrderByDescending(f => f.size))
        {
            Console.WriteLine($"  {key}: {size / 1024.0:F2} KB");
        }
    }
}

static string? GetOption(string[] args, string option)
{
    var index = Array.IndexOf(args, option);
    if (index >= 0 && index + 1 < args.Length)
    {
        return args[index + 1];
    }
    return null;
}
