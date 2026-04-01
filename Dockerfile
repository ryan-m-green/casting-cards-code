# Build stage — context is repo root (code/)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files
COPY ["backend/CastLibrary.WebHost/CastLibrary.WebHost.csproj", "backend/CastLibrary.WebHost/"]
COPY ["backend/CastLibrary.Repository/CastLibrary.Repository.csproj", "backend/CastLibrary.Repository/"]
COPY ["backend/CastLibrary.Logic/CastLibrary.Logic.csproj", "backend/CastLibrary.Logic/"]
COPY ["backend/CastLibrary.Adapter/CastLibrary.Adapter.csproj", "backend/CastLibrary.Adapter/"]
COPY ["backend/CastLibrary.Shared/CastLibrary.Shared.csproj", "backend/CastLibrary.Shared/"]
COPY ["backend/CastLibrary.Initializer/CastLibrary.Initializer.csproj", "backend/CastLibrary.Initializer/"]

# Restore dependencies
RUN dotnet restore "backend/CastLibrary.WebHost/CastLibrary.WebHost.csproj"

# Copy source code
COPY backend/ backend/

# Publish
FROM build AS publish
RUN dotnet publish "backend/CastLibrary.WebHost/CastLibrary.WebHost.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY --from=publish /app/publish .

RUN mkdir -p /tmp/logs /tmp/images

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "CastLibrary.WebHost.dll"]
