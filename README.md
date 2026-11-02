# Meteo El Viso de San Juan

Live weather from a personal weather station in **El Viso de San Juan (Toledo, Spain)**, in the La Sagra region, at about 653 m above sea level.

**🌐 Live site: [javierbecerra.github.io/meteo](https://javierbecerra.github.io/meteo/)**

The station is an amateur setup. Readings are published as they arrive and are not quality-controlled by any official weather service.

---

## What you'll find on the site

- **Current conditions**, refreshed every minute: temperature, humidity, wind speed, gusts and direction, pressure and its 3-hour trend, rainfall and rain rate, solar radiation and UV index.
- **Today's extremes**, plus monthly and yearly highs and lows.
- **Charts** for the last 24 hours, 48 hours or 7 days, downloadable as CSV.
- **History and records**: daily summaries, monthly tables and all-time records since the station went online, also downloadable as CSV.
- **Forecast**: hourly for the next 24 hours and daily for the next 7 days.
- **Interactive maps**: radar, rain forecast, wind and temperature.
- **Sun and moon**: sunrise and sunset, daylight hours, moon phase and tonight's expected cloud cover.
- **Air quality and pollen**: the European Air Quality Index, main pollutants and pollen levels.
- Light and dark themes, and a layout that works on mobile.

## How it works

```
Ecowitt console ──► ecowitt.net ──► Cloudflare Worker ──► Cloudflare D1
  (Wi-Fi upload)                    (runs every minute)    (stores readings)
                                            │
                                            ▼
                     Static website on GitHub Pages ◄── reads JSON from the Worker
                                            │
                                            └── Open-Meteo (forecast, air quality, sun)
                                                Windy (maps)
```

1. The station console uploads its readings to **ecowitt.net** over Wi-Fi.
2. A **Cloudflare Worker** runs every minute on a Cron Trigger. It reads the latest values from the Ecowitt API and stores them in a **Cloudflare D1** database. It also keeps a 7-day history at 5-minute resolution and a permanent summary for each day.
3. The website is a set of plain static files (HTML, CSS and vanilla JavaScript) hosted on **GitHub Pages**. It fetches its JSON data from the Worker, and falls back to a copy in `data/` if the Worker is unreachable.
4. Forecast, air quality and astronomy data come straight from **Open-Meteo**; the maps are embedded from **Windy**.

There is no build step and no framework, and everything runs on free tiers.

## Repository structure

| Path | Contents |
|---|---|
| `index.html` | Home page: current conditions, forecast, maps, sun and moon, air quality |
| `graficas.html` | Charts |
| `historico.html` | History, records and climate tables |
| `assets/comun.js` | Shared code and site configuration (`CONFIG`) |
| `assets/estilo.css` | Styles |
| `cloudflare/worker.js` | The Cloudflare Worker that collects and serves the data |
| `data/` | Fallback copy of the station data |
| `images/` | Site images |

## Data endpoints

The Worker serves three public JSON files:

| Endpoint | Contents |
|---|---|
| `/data/current.json` | Latest reading, plus today's, this month's and this year's extremes |
| `/data/history.json` | Readings from the last 7 days, one every 5 minutes |
| `/data/daily.json` | One summary per day: max/min/mean temperature, humidity, pressure, max gust, rainfall |

Units: °C, %, hPa, km/h, mm and W/m². Times are Unix timestamps; daily keys are local dates (Europe/Madrid).

## Running your own

The code can be adapted to any Ecowitt station:

1. **Website:** fork this repository and enable GitHub Pages (deploy from the `main` branch, root folder). Then edit the `CONFIG` block at the top of `assets/comun.js`: name, location, coordinates, altitude and your Worker URL.
2. **Worker:** create a Cloudflare Worker with the code in `cloudflare/worker.js`. Bind a D1 database as `DB` and add a Cron Trigger (`* * * * *`). Then add three secrets from your ecowitt.net account: `ECOWITT_APP_KEY`, `ECOWITT_API_KEY` and `ECOWITT_MAC`.
3. Open `https://<your-worker>.workers.dev/actualizar` once to load the first reading.

API keys live only as Cloudflare secrets and never appear in this repository.

## Credits

- Station data: [Ecowitt](https://www.ecowitt.net)
- Forecast, air quality (CAMS) and astronomy: [Open-Meteo](https://open-meteo.com)
- Maps: [Windy](https://www.windy.com)
- Hosting: [GitHub Pages](https://pages.github.com) and [Cloudflare Workers](https://workers.cloudflare.com)
- Weather icons and moon phases are original drawings made for this site.
