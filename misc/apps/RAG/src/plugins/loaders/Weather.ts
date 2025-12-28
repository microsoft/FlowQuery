/**
 * Example plugin: Fetch weather forecast for a location.
 *
 * Usage in FlowQuery:
 *   CALL weather('Oslo') YIELD date, location, temperature, humidity
 */
import { AsyncFunction, FunctionDef } from "flowquery/extensibility";

const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_API = "https://api.met.no/weatherapi/locationforecast/2.0/compact";

/**
 * Weather class - fetches weather forecast for a given location.
 */
@FunctionDef({
    description:
        "Fetches weather forecast for a location using Open-Meteo geocoding and MET Norway weather API",
    category: "async",
    parameters: [
        {
            name: "location",
            description: 'The name of the location to get weather for (e.g., "Oslo", "New York")',
            type: "string",
            required: true,
        },
    ],
    output: {
        description: "Weather forecast data point with location and weather parameters",
        type: "object",
        properties: {
            date: { description: "ISO 8601 timestamp in UTC", type: "string" },
            location: { description: "Name of the location", type: "string" },
            lat: { description: "Latitude in decimal degrees", type: "number" },
            lon: { description: "Longitude in decimal degrees", type: "number" },
            temperature: { description: "Air temperature in celsius", type: "number" },
            humidity: { description: "Relative humidity in %", type: "number" },
            pressure: { description: "Air pressure at sea level in hPa", type: "number" },
            cloud_cover: { description: "Total cloud cover in %", type: "number" },
            wind_speed: { description: "Wind speed in m/s", type: "number" },
            wind_direction: {
                description: "Wind direction in degrees (0=N, 90=E, 180=S, 270=W)",
                type: "number",
            },
            precipitation: {
                description: "Expected precipitation in mm (next hour if available)",
                type: "number",
            },
            symbol: {
                description: 'Weather symbol code (e.g., "partlycloudy_day", "rain")',
                type: "string",
            },
        },
    },
    examples: [
        "CALL weather('Oslo') YIELD date, location, temperature, humidity",
        "CALL weather('London') YIELD date, location, temperature, wind_speed, precipitation",
    ],
})
export class Weather extends AsyncFunction {
    private readonly geocodingApiUrl: string;
    private readonly weatherApiUrl: string;

    constructor(geocodingApiUrl: string = GEOCODING_API, weatherApiUrl: string = WEATHER_API) {
        super();
        this.geocodingApiUrl = geocodingApiUrl;
        this.weatherApiUrl = weatherApiUrl;
    }

    /**
     * Fetches weather forecast for a given location.
     *
     * @param location - The name of the location to get weather for
     */
    async *generate(location: string): AsyncGenerator<any, void, unknown> {
        // Step 1: Geocode the location name to get lat/lon
        const geocodeUrl = `${this.geocodingApiUrl}?name=${encodeURIComponent(location)}`;
        const geocodeResponse = await fetch(geocodeUrl);

        if (!geocodeResponse.ok) {
            throw new Error(`Failed to geocode location: ${geocodeResponse.statusText}`);
        }

        const geocodeData = await geocodeResponse.json();

        if (!geocodeData.results || geocodeData.results.length === 0) {
            throw new Error(`Location not found: ${location}`);
        }

        const firstResult = geocodeData.results[0];
        const lat = firstResult.latitude;
        const lon = firstResult.longitude;

        // Step 2: Fetch weather forecast using lat/lon
        const weatherUrl = `${this.weatherApiUrl}?lat=${lat}&lon=${lon}`;
        const weatherResponse = await fetch(weatherUrl, {
            headers: {
                // MET Norway API requires a User-Agent header
                "User-Agent": "FlowQuery-RAG/1.0",
            },
        });

        if (!weatherResponse.ok) {
            throw new Error(`Failed to fetch weather: ${weatherResponse.statusText}`);
        }

        const weatherData = await weatherResponse.json();

        // Transform timeseries into simplified flat records and yield row by row
        const locationName = firstResult.name;
        const timeseries = weatherData.properties?.timeseries || [];

        for (const entry of timeseries) {
            const instant = entry.data?.instant?.details || {};
            const next1h = entry.data?.next_1_hours || {};
            const next6h = entry.data?.next_6_hours || {};

            yield {
                date: entry.time,
                location: locationName,
                lat,
                lon,
                temperature: instant.air_temperature,
                humidity: instant.relative_humidity,
                pressure: instant.air_pressure_at_sea_level,
                cloud_cover: instant.cloud_area_fraction,
                wind_speed: instant.wind_speed,
                wind_direction: instant.wind_from_direction,
                precipitation:
                    next1h.details?.precipitation_amount ??
                    next6h.details?.precipitation_amount ??
                    null,
                symbol: next1h.summary?.symbol_code ?? next6h.summary?.symbol_code ?? null,
            };
        }
    }
}

export default Weather;
