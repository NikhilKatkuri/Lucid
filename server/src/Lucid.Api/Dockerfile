FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/Lucid.Api/Lucid.Api.csproj", "src/Lucid.Api/"]
COPY ["src/Lucid.Domain/Lucid.Domain.csproj", "src/Lucid.Domain/"]
COPY ["src/Lucid.Application/Lucid.Application.csproj", "src/Lucid.Application/"]
COPY ["src/Lucid.Infrastructure/Lucid.Infrastructure.csproj", "src/Lucid.Infrastructure/"]
RUN dotnet restore "src/Lucid.Api/Lucid.Api.csproj"
COPY . .
WORKDIR "/src/src/Lucid.Api"
RUN dotnet build "Lucid.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Lucid.Api.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Lucid.Api.dll"]
