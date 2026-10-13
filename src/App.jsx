import { useCallback, useEffect, useState } from "react";
import Papa from "papaparse";
import { useRef } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

// 👉 Plugin for centering text
const centerTextPlugin = {
  id: "centerText",
  beforeDraw(chart) {
    const { ctx, width, height } = chart;

    const meta = chart.data.datasets[0];
    const value = meta?.centerValue;

    const safeValue =
      typeof value === "number" && !isNaN(value) ? value : 0;

    ctx.save();
    ctx.font = "bold 56px Arial";
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(
      `${(safeValue * 100).toFixed(0)}%`,
      width / 2,
      height / 2
    );

    ctx.restore();
  },
};

ChartJS.register(centerTextPlugin);

function Clock() { //Running clock to get the current time
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return time.toLocaleTimeString();
}

function App() { //bulk code for webpage
  const requestIdRef = useRef(0);
  //sets the initial values
  const [values, setValues] = useState([0, 0, 0, 0]);
  const [weather, setWeather] = useState({ temp: "--", humidity: "--", city: "Loading...", iconUrl: ""})
  const [advice, setAdvice] = useState("");
  const [adviceError, setAdviceError] = useState("");
  const [adviceLoading, setAdviceLoading] = useState(true);

  const fetchAdvice = useCallback(async (signal) => {
    setAdviceLoading(true);
    setAdviceError("");

    try {
      const response = await fetch(
        "/api/quote",
        { signal, cache: "no-store" }
      );
      if (!response.ok) {
        throw new Error(`Quote API returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (typeof data.quote !== "string" || !data.quote.trim()) {
        throw new Error("Quote API response did not contain quote text");
      }

      const author =
        typeof data.author === "string" && data.author.trim()
          ? ` — ${data.author.trim()}`
          : "";
      setAdvice(`${data.quote.trim()}${author}`);
    } catch (error) {
      if (signal?.aborted) return;
      console.error("Quote fetch failed:", error);
      setAdviceError("A quote is unavailable right now. Please try again.");
    } finally {
      if (!signal?.aborted) setAdviceLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchAdvice(controller.signal);

    const adviceInterval = setInterval(
      () => fetchAdvice(controller.signal),
      60 * 60 * 1000
    );

    return () => {
      clearInterval(adviceInterval);
      controller.abort();
    };
  }, [fetchAdvice]);

  // Fetch weather from the Internet
  const fetchWeather = async () => {
    const API_KEY = import.meta.env.VITE_WEATHER_KEY?.trim();
    const CITY = "Waterloo,CA";

    if (!API_KEY) {
      setWeather({
        temp: 21,
        humidity: 54,
        city: "Waterloo, CA",
        iconUrl: "https://openweathermap.org/img/wn/01d@4x.png",
      });
      return;
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${CITY}&units=metric&appid=${API_KEY}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Weather API returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.main && data.weather) {
        const iconCode = data.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;

        setWeather({
          temp: Math.round(data.main.temp),
          humidity: data.main.humidity,
          city: data.name,
          iconUrl,
        });
      }
    } catch (error) {
      console.error("Weather fetch failed:", error);
      setWeather({
        temp: 21,
        humidity: 54,
        city: "Waterloo, CA",
        iconUrl: "https://openweathermap.org/img/wn/01d@4x.png",
      });
    }
  };

  const fetchData = () => { //fetching data from the google sheets for N2 tank values
    const currentRequestId = ++requestIdRef.current; 
    const url =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vSN5qPhWup61lFgFwM89RmJKmCK_cE3dpoIWB0nrMAJ8m__DG9JHPsAkFDxlisDkYMxw1y4LjUkEzDt/pub?gid=0&single=true&output=csv"  +
    `&t=${Date.now()}`;



    Papa.parse(url, {
      download: true,
      complete: (result) => {
        if (currentRequestId !== requestIdRef.current) return;
        const rows = result.data;
        const percentageRow = rows[8];

        const tankValues = percentageRow
          .slice(2, 6)
          .map((v) => parseFloat(v));

        if (tankValues.every((v) => !isNaN(v))) {
          setValues(tankValues);
        }
      },
    });
  };

  useEffect(() => {  //sets interval for when we fetch tank and weather values
    fetchData(); //Tank data
    fetchWeather(); //Initial weather fetch

    const tankInterval = setInterval(fetchData, 10000);

    const weatherInterval = setInterval(fetchWeather, 600000);

    return () => {
      clearInterval(tankInterval);
      clearInterval(weatherInterval);
    };
  }, []);

  //labels & colors
  const labels = ["Tank 1", "Tank 2", "Tank 3", "Tower"]; //change headings here

  const colors = ["#4CAF50", "#F44336", "#2196F3", "#FFC107"];

  const getAdviceTextSize = (text) => {
    const length = text?.length ?? 0;

    if (length <= 45) return "clamp(1.25rem, 2vw, 2.5rem)";
    if (length <= 90) return "clamp(1rem, 1.7vw, 2rem)";
    if (length <= 140) return "clamp(0.9rem, 1.3vw, 1.5rem)";
    return "clamp(0.8rem, 1vw, 1.25rem)";
  };

  const adviceText = adviceLoading ? "Loading advice..." : adviceError || advice;

  //creating UI
  return (
    <div className="dashboard">
      {/* TOP BAR */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Nitrogen Tank Status</h1>
        </div>
        <p className="dashboard-location">
             📍 {weather.city}
        </p>
        <div className="dashboard-clock">
          <Clock />
        </div>
      </div>

      {/* CHARTS */}
      <div className="tank-section-divider" aria-hidden="true" />
      <div className="tank-chart-row">
        {values.map((val, i) => {
          const data = {
            labels: [labels[i], "Remaining"],
            datasets: [{
              data: [val, 1 - val],
              backgroundColor: [colors[i], "#e0e0e0"],
              borderWidth: 0,
              centerValue: val,
            }],
          };

          const options = {
            cutout: "75%",
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { enabled: true }
            },
          };

          return (
            <div key={i} className="tank-card">
              <h3>{labels[i]}</h3>
              <div className="tank-chart">
                <Doughnut data={data} options={options} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bottom-bar">
        <div className="weather-group">
          <div className="weather-reading">
            <span>Temp:</span>
            <strong>{weather.temp}°C</strong>
          </div>

          <div className="weather-reading">
            <span>Humidity:</span>
            <strong>{weather.humidity}%</strong>
          </div>
        </div>

        <div className="weather-icon-slot">
          {weather.iconUrl && (
            <div className="weather-icon">
              <img src={weather.iconUrl} alt="Weather Icon" />
            </div>
          )}
        </div>

        <section className="advice-card" aria-label="Quote of the day">
          <p
            className="advice-text"
            aria-live="polite"
            style={{ fontSize: getAdviceTextSize(adviceText) }}
          >
            {adviceText}
          </p>
        </section>
      </div>
    </div>
  );
}

export default App;
