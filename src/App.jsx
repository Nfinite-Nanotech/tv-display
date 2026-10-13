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
        `https://api.adviceslip.com/advice?timestamp=${Date.now()}`,
        { signal, cache: "no-store" }
      );
      if (!response.ok) {
        throw new Error(`Advice API returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (typeof data.slip?.advice !== "string" || !data.slip.advice.trim()) {
        throw new Error("Advice API response did not contain advice text");
      }

      setAdvice(data.slip.advice);
    } catch (error) {
      if (signal?.aborted) return;
      console.error("Advice fetch failed:", error);
      setAdviceError("Advice is unavailable right now. Please try again.");
    } finally {
      if (!signal?.aborted) setAdviceLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchAdvice(controller.signal);
    return () => controller.abort();
  }, [fetchAdvice]);

  // Fetch weather from the Internet
  const fetchWeather = async () => {
    const API_KEY = import.meta.env.VITE_WEATHER_KEY; // 👈 Put your key here
    const CITY = 'Waterloo,CA'; // 👈 Change to your city
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${CITY}&units=metric&appid=${API_KEY}`; //uses open weather map

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.main && data.weather) {
        const iconCode = data.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@4x.png`; //fetching icons

        setWeather({
          temp: Math.round(data.main.temp),
          humidity: data.main.humidity,
          city: data.name,
          iconUrl: iconUrl
        });
      }
    } catch (error) {
      console.error("Weather fetch failed:", error);
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

        <section className="advice-card" aria-label="Advice of the day">
          <p className="advice-text" aria-live="polite">
            {adviceLoading ? "Loading advice..." : adviceError || advice}
          </p>
        </section>
      </div>
    </div>
  );
}

export default App;
