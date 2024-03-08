import express from "express";
import axios from "axios";
import bodyParser from "body-parser";

const app = express();
const port = 3000;

// API URLs
const OneCallAPI_URL = "https://api.openweathermap.org/data/3.0/onecall";
const DirectGeoCoding_URL = "https://api.openweathermap.org/geo/1.0/direct";

const apiKey = process.env.API_KEY;

if (!apiKey) {
    console.error("API key not found. Make sure to set the API_KEY environment variable.");
    process.exit(1);
}

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// Render the index page with empty weather data
app.get("/", (req, res) => {
    res.render("index.ejs", { weatherData: {} });
});

// Fetch weather data based on user input
app.post("/get-weather", async (req, res) => {
    // Extract user input from the request body
    const cityInput = req.body.city;
    const stateInput = req.body.state;
    const countryInput = req.body.country;

    // Construct location query based on user input
    // City name, state code (only for the US) and country code divided by comma. Please use ISO 3166 country codes.
    let locationQuery = cityInput;
    if (stateInput) {
        locationQuery += ", " + stateInput;
    }
    if (countryInput) {
        locationQuery += ", " + countryInput;
    }
    // Initialize weather data as an empty object
    let weatherData = {};

    try {
        // Fetch geocoding data for the location query 
        const geoResponse = await axios.get(DirectGeoCoding_URL, {
            params: {
                q: locationQuery,
                appid: apiKey,
            },
        });

        // We need the latitude and longitude to fetch weather data
        const latitude = geoResponse.data[0].lat;
        const longitude = geoResponse.data[0].lon;

        // If geocoding data is available
        if (latitude && longitude) {

            // Fetch weather data using latitude and longitude 
            const weatherResponse = await axios.get(OneCallAPI_URL, {
                params: {
                    lat: latitude,
                    lon: longitude,
                    appid: apiKey,
                    units: "metric",
                    exclude: "minutely,hourly,daily,alerts", // Exclude unnecessary data
                },
            });

            // Extract current weather data 
            // const currentWeather = weatherResponse.data.current;

            // Extract sunrise time from the response
            const sunriseUnixTimestamp = weatherResponse.data.current.sunrise;
            const sunriseDate = new Date(sunriseUnixTimestamp * 1000);
            const sunriseHours = sunriseDate.getHours();
            const sunriseMinutes = "0" + sunriseDate.getMinutes();
            const sunriseSeconds = "0" + sunriseDate.getSeconds();
            const formattedSunriseTime = sunriseHours + ':' + sunriseMinutes.substr(-2) + ':' + sunriseSeconds.substr(-2);


            // Extract sunset time from the response
            const sunsetUnixTimestamp = weatherResponse.data.current.sunset;
            const sunsetDate = new Date(sunsetUnixTimestamp * 1000);
            const sunsetHours = sunsetDate.getHours();
            const sunsetMinutes = "0" + sunsetDate.getMinutes();
            const sunsetSeconds = "0" + sunsetDate.getSeconds();
            const formattedSunsetTime = sunsetHours + ':' + sunsetMinutes.substr(-2) + ':' + sunsetSeconds.substr(-2);


            // Populate weather data object with relevant information
            weatherData = {
                location: geoResponse.data[0].name + ", " + geoResponse.data[0].state + ", " + geoResponse.data[0].country,
                temperature: weatherResponse.data.current.temp + "°C",
                description: weatherResponse.data.current.weather.description,
                humidity: weatherResponse.data.current.humidity + "%",
                windSpeed: weatherResponse.data.current.wind_speed + "m/s",
                windGust: weatherResponse.data.current.wind_gust + "m/s",
                pressure: weatherResponse.data.current.pressure + "hPa",
                visibility: weatherResponse.data.current.visibility + "m",
                sunrise: formattedSunriseTime,
                sunset: formattedSunsetTime,
                icon: weatherResponse.data.current.weather.icon,
            };
        } else {
            // If no geocoding data is found, populate weather data with an error message
            weatherData = { error: "No data found for this location." };
        }
    } catch (error) {
        // Handle errors and populate weather data
        console.error("Error fetching data: ", error);
        weatherData = { error: "Failed to fetch data." };
    }

    // Render the index page with weather data 
    res.render("index.ejs", { weatherData });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
