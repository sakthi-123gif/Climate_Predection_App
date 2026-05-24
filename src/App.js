import React, { useState, useEffect, useCallback } from 'react';

const api = {
  key: "48fb89dc95a76d051e05844a12d6da2d",
  base: "https://api.openweathermap.org/data/2.5/"
}

function App() {
  const [query, setQuery] = useState('');
  const [weather, setWeather] = useState({});
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const processForecast = (list) => {
    const days = {};
    list.forEach(item => {
      const date = new Date(item.dt * 1000).toLocaleDateString();
      if (!days[date]) {
        days[date] = { temps: [], conditions: [], icons: [] };
      }
      days[date].temps.push(item.main.temp);
      days[date].conditions.push(item.weather[0].main);
      days[date].icons.push(item.weather[0].icon);
    });
    return Object.values(days).slice(0, 5).map(day => ({
      temp_min: Math.min(...day.temps),
      temp_max: Math.max(...day.temps),
      main: day.conditions[Math.floor(day.conditions.length / 2)],
      icon: day.icons[Math.floor(day.icons.length / 2)]
    }));
  };

  const fetchWeather = useCallback((city) => {
    if (!city) return;
    setLoading(true);
    setError('');

    Promise.all([
      fetch(`${api.base}weather?q=${encodeURIComponent(city)}&units=metric&APPID=${api.key}`).then(r => r.json()),
      fetch(`${api.base}forecast?q=${encodeURIComponent(city)}&units=metric&APPID=${api.key}`).then(r => r.json())
    ])
      .then(([weatherData, forecastData]) => {
        if (weatherData.cod === 200) {
          setWeather(weatherData);
          setForecast(forecastData.cod === "200" ? processForecast(forecastData.list) : []);
        } else {
          setWeather({});
          setForecast([]);
          setError(weatherData.message || 'City not found');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Network error. Please try again.');
        setLoading(false);
      });
  }, []);

  const refreshWeather = useCallback(() => {
    if (weather.name) fetchWeather(weather.name);
  }, [weather.name, fetchWeather]);

  useEffect(() => {
    if (!weather.name) return;
    const timer = setInterval(refreshWeather, 300000);
    return () => clearInterval(timer);
  }, [weather.name, refreshWeather]);

  const search = evt => {
    if (evt.key === "Enter") {
      fetchWeather(query);
      setQuery('');
    }
  }

  const dateBuilder = (d) => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
  }

  const getIcon = (icon) => `https://openweathermap.org/img/wn/${icon}@2x.png`;

  const downloadCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['City', weather.name],
      ['Country', weather.sys.country],
      ['Temperature (°C)', Math.round(weather.main.temp)],
      ['Feels Like (°C)', Math.round(weather.main.feels_like)],
      ['Humidity (%)', weather.main.humidity],
      ['Wind Speed (m/s)', weather.wind.speed],
      ['Pressure (hPa)', weather.main.pressure],
      ['Condition', weather.weather[0].description],
      ['', ''],
      ['Forecast', ''],
      ['Date', 'Max Temp (°C),Min Temp (°C),Condition']
    ];
    forecast.forEach((day, i) => {
      const date = new Date(Date.now() + (i + 1) * 86400000).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
      rows.push([date, `${Math.round(day.temp_max)},${Math.round(day.temp_min)},${day.main}`]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${weather.name}_weather_report.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const downloadTXT = () => {
    const lines = [];
    const date = dateBuilder(new Date());
    lines.push('==================================');
    lines.push('   WEATHER REPORT');
    lines.push('==================================');
    lines.push(`  City:      ${weather.name}, ${weather.sys.country}`);
    lines.push(`  Date:      ${date}`);
    lines.push(`  Temp:      ${Math.round(weather.main.temp)}°C`);
    lines.push(`  Feels Like: ${Math.round(weather.main.feels_like)}°C`);
    lines.push(`  Condition: ${weather.weather[0].description}`);
    lines.push(`  Humidity:  ${weather.main.humidity}%`);
    lines.push(`  Wind:      ${weather.wind.speed} m/s`);
    lines.push(`  Pressure:  ${weather.main.pressure} hPa`);
    lines.push('----------------------------------');
    lines.push('  5-DAY FORECAST');
    lines.push('----------------------------------');
    forecast.forEach((day, i) => {
      const d = new Date(Date.now() + (i + 1) * 86400000).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
      lines.push(`  ${d}:  ${Math.round(day.temp_max)}°C / ${Math.round(day.temp_min)}°C  ${day.main}`);
    });
    lines.push('==================================');
    const txt = lines.join('\n');
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${weather.name}_weather_report.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className={(typeof weather.main != "undefined") ? ((weather.main.temp > 16) ? 'app warm' : 'app') : 'app'}>
      <main>
        <div className="search-box">
          <input
            type="text"
            className="search-bar"
            placeholder="Search..."
            onChange={e => setQuery(e.target.value)}
            value={query}
            onKeyPress={search}
          />
        </div>

        {error && <div className="error-msg">{error}</div>}
        {loading && <div className="loading">Loading...</div>}

        {(typeof weather.main != "undefined") ? (
        <div>
          <div className="location-box">
            <div className="location">{weather.name}, {weather.sys.country}</div>
            <div className="date">{dateBuilder(new Date())}</div>
          </div>

          <div className="weather-box">
            <img src={getIcon(weather.weather[0].icon)} alt="" className="weather-icon" />
            <div className="temp">{Math.round(weather.main.temp)}°c</div>
            <div className="weather">{weather.weather[0].description}</div>
            <div className="details">
              <div className="detail">Humidity: {weather.main.humidity}%</div>
              <div className="detail">Wind: {weather.wind.speed} m/s</div>
              <div className="detail">Pressure: {weather.main.pressure} hPa</div>
            </div>
          </div>

          <div className="download-buttons">
            <button onClick={downloadCSV} className="download-btn">Download CSV</button>
            <button onClick={downloadTXT} className="download-btn">Download TXT</button>
          </div>

          {forecast.length > 0 && (
            <div className="forecast-section">
              <h3>5-Day Forecast</h3>
              <div className="forecast-grid">
                {forecast.map((day, i) => (
                  <div key={i} className="forecast-day">
                    <div className="forecast-date">
                      {new Date(Date.now() + (i + 1) * 86400000).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <img src={getIcon(day.icon)} alt="" className="forecast-icon" />
                    <div className="forecast-temps">
                      <span className="high">{Math.round(day.temp_max)}°</span>
                      <span className="sep">/</span>
                      <span className="low">{Math.round(day.temp_min)}°</span>
                    </div>
                    <div className="forecast-main">{day.main}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        ) : null}
      </main>
    </div>
  );
}

export default App;
