# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy solution and project files
COPY ["CastLibrary.WebHost/CastLibrary.WebHost.csproj", "CastLibrary.WebHost/"]
COPY ["CastLibrary.Repository/CastLibrary.Repository.csproj", "CastLibrary.Repository/"]
COPY ["CastLibrary.Logic/CastLibrary.Logic.csproj", "CastLibrary.Logic/"]
COPY ["CastLibrary.Adapter/CastLibrary.Adapter.csproj", "CastLibrary.Adapter/"]
COPY ["CastLibrary.Shared/CastLibrary.Shared.csproj", "CastLibrary.Shared/"]
COPY ["CastLibrary.Initializer/CastLibrary.Initializer.csproj", "CastLibrary.Initializer/"]

# Restore dependencies
RUN dotnet restore "CastLibrary.WebHost/CastLibrary.WebHost.csproj"

# Copy source code
COPY . .

# Build the application
RUN dotnet build "CastLibrary.WebHost/CastLibrary.WebHost.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "CastLibrary.WebHost/CastLibrary.WebHost.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy published application
COPY --from=publish /app/publish .

# Create directories for logs and images
RUN mkdir -p /tmp/logs /tmp/images

# Expose port (App Platform will use environment variable PORT)
EXPOSE 8080

# Set environment variables
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run application
ENTRYPOINT ["dotnet", "CastLibrary.WebHost.dll"]
