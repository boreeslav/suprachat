FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY src/SuperMessenger.Core/SuperMessenger.Core.csproj src/SuperMessenger.Core/
COPY src/SuperMessenger.Infrastructure/SuperMessenger.Infrastructure.csproj src/SuperMessenger.Infrastructure/
COPY src/SuperMessenger.Web/SuperMessenger.Web.csproj src/SuperMessenger.Web/
RUN dotnet restore src/SuperMessenger.Web/SuperMessenger.Web.csproj
COPY src/ src/
RUN dotnet publish src/SuperMessenger.Web/SuperMessenger.Web.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:80
ENV Data__Root=/app/data
ENV Data__FilesPath=/app/data/uploads
VOLUME ["/app/data"]
COPY --from=build /app/publish .
EXPOSE 80
ENTRYPOINT ["dotnet", "SuperMessenger.Web.dll"]
