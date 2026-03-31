using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Commands.City;

public interface IUploadCityImageCommandHandler
{
    Task<(bool Success, string ImageKey)> HandleAsync(UploadCityImageCommand command);
}
public class UploadCityImageCommandHandler(
    ICityReadRepository cityReadRepository,
    IImageStorageOperator imageStorage,
    IImageKeyCreator imageKeyCreator) : IUploadCityImageCommandHandler
{
    public async Task<(bool Success, string ImageKey)> HandleAsync(UploadCityImageCommand command)
    {
        var city = await cityReadRepository.GetByIdAsync(command.CityId);
        if (city is null || city.DmUserId != command.DmUserId)
        {
            return (false, null);
        }

        var key = imageKeyCreator.Create(command.DmUserId, command.CityId, EntityType.City);

        await imageStorage.SaveAsync(key, command.Stream, command.ContentType);

        return (true, key);
    }
}

public class UploadCityImageCommand
{
    public UploadCityImageCommand(Guid cityId, Guid dmUserId, Stream stream, string contentType)
    {
        CityId = cityId;
        DmUserId = dmUserId;
        Stream = stream;
        ContentType = contentType;
    }

    public Guid CityId { get; }
    public Guid DmUserId { get; }
    public Stream Stream { get; }
    public string ContentType { get; }
}
