import { useState, useEffect } from "react";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import "./App.css";

function App() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState(null);
  const [readings, setReadings] = useState([]);
  const [locationAverages, setLocationAverages] = useState([]);
  const [locationComparison, setLocationComparison] = useState([]);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [country, setCountry] = useState("EE");

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/health");
        if (!response.ok) {
          throw new Error("Backend pole saadaval");
        }
        const data = await response.json();
        setStatus(data);
        setError(null);
      } catch (err) {
        setError(err.message);
        setStatus(null);
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
  }, []);

  const toUtcIso = (dateValue, isEndOfDay = false) => {
    if (!dateValue) return null;
    const timePart = isEndOfDay ? "T23:59:59Z" : "T00:00:00Z";
    return `${dateValue}${timePart}`;
  };

  const fetchReadingsForLocation = async (locationCode, startIso, endIso) => {
    const params = new URLSearchParams({
      start: startIso,
      end: endIso,
      location: locationCode,
    });

    const response = await fetch(
      `http://localhost:3000/api/readings?${params.toString()}`
    );
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `Andmete laadimine ebaõnnestus (${locationCode})`);
    }

    return Array.isArray(data.data) ? data.data : [];
  };

  const syncPricesForLocation = async (locationCode, startIso, endIso) => {
    const response = await fetch("http://localhost:3000/api/sync/prices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        start: startIso,
        end: endIso,
        location: locationCode,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `Sünkroonimine ebaõnnestus (${locationCode})`);
    }

    return data;
  };

  const loadReadings = async () => {
    const startIso = toUtcIso(startDate, false);
    const endIso = toUtcIso(endDate, true);

    if (!startIso || !endIso) {
      setChartError("Vali enne nii algus- kui lõppkuupäev");
      return;
    }

    setChartLoading(true);
    setChartError(null);

    try {
      await Promise.all([
        syncPricesForLocation("EE", startIso, endIso),
        syncPricesForLocation("LV", startIso, endIso),
        syncPricesForLocation("FI", startIso, endIso),
      ]);

      const [selectedReadings, eeReadings, lvReadings, fiReadings] = await Promise.all([
        fetchReadingsForLocation(country, startIso, endIso),
        fetchReadingsForLocation("EE", startIso, endIso),
        fetchReadingsForLocation("LV", startIso, endIso),
        fetchReadingsForLocation("FI", startIso, endIso),
      ]);

      const calculateAverage = (items) => {
        const values = items
          .map((entry) => Number(entry.price_eur_mwh))
          .filter((value) => Number.isFinite(value));

        if (values.length === 0) {
          return null;
        }

        const total = values.reduce((sum, value) => sum + value, 0);
        return total / values.length;
      };

      setReadings(selectedReadings);
      setLocationAverages([
        { location: "EE", label: "Eesti", average: calculateAverage(eeReadings) },
        { location: "LV", label: "Läti", average: calculateAverage(lvReadings) },
        { location: "FI", label: "Soome", average: calculateAverage(fiReadings) },
      ]);

      const compareTimesMap = new Map();
      [
        { location: "EE", readings: eeReadings },
        { location: "LV", readings: lvReadings },
        { location: "FI", readings: fiReadings },
      ].forEach(({ location, readings: locationReadings }) => {
        locationReadings.forEach((entry) => {
          const timestampKey = entry.timestamp;
          const current = compareTimesMap.get(timestampKey) || {
            timestamp: timestampKey,
            EE: null,
            LV: null,
            FI: null,
          };

          current[location] = Number(entry.price_eur_mwh);
          compareTimesMap.set(timestampKey, current);
        });
      });

      setLocationComparison(
        Array.from(compareTimesMap.values()).sort((left, right) =>
          left.timestamp.localeCompare(right.timestamp)
        )
      );
      setHoveredIndex(null);
    } catch (err) {
      setReadings([]);
      setLocationAverages([]);
      setLocationComparison([]);
      setChartError(err.message);
    } finally {
      setChartLoading(false);
    }
  };

  const handleSyncPrices = async () => {
    setSyncLoading(true);
    setSyncResult(null);

    const startIso = toUtcIso(startDate, false);
    const endIso = toUtcIso(endDate, true);

    if (!startIso || !endIso) {
      setSyncResult({
        success: false,
        error: "Vali enne nii algus- kui lõppkuupäev",
      });
      setSyncLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/api/sync/prices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start: startIso,
          end: endIso,
          location: country,
        }),
      });

      const data = await response.json();
      setSyncResult(data);

      if (response.ok && data.success) {
        await loadReadings();
      }
    } catch (err) {
      setSyncResult({ success: false, error: err.message });
    } finally {
      setSyncLoading(false);
    }
  };

  const selectedRange =
    startDate && endDate ? `${startDate} - ${endDate}` : "Vali kuupäevavahemik";
  const countryDisplay = country ? `Valitud riik: ${country}` : "Vali riik";
  const chartPoints = readings.map((entry) => ({
    time: new Date(entry.timestamp),
    price: entry.price_eur_mwh ?? null,
  }));
  const chartSeries = chartPoints.map((point) => point.price);
  const chartTimes = chartPoints.map((point) => point.time);
  const dailyAverageMap = new Map();

  readings.forEach((entry) => {
    const price = entry.price_eur_mwh;
    if (price == null || Number.isNaN(Number(price))) {
      return;
    }

    const dayKey = new Date(entry.timestamp).toISOString().slice(0, 10);
    const current = dailyAverageMap.get(dayKey) || { sum: 0, count: 0 };
    dailyAverageMap.set(dayKey, {
      sum: current.sum + Number(price),
      count: current.count + 1,
    });
  });

  const dailyAverages = Array.from(dailyAverageMap.entries())
    .map(([day, bucket]) => ({
      day,
      average: bucket.count > 0 ? bucket.sum / bucket.count : null,
    }))
    .sort((left, right) => left.day.localeCompare(right.day));

  const dailyAverageDays = dailyAverages.map((item) => item.day);
  const dailyAverageValues = dailyAverages.map((item) => item.average);
  const locationAverageLabels = locationAverages.map((item) => item.label);
  const locationAverageValues = locationAverages.map((item) => item.average);
  const comparisonTimes = locationComparison.map((item) => new Date(item.timestamp));
  const comparisonSeriesEE = locationComparison.map((item) => item.EE);
  const comparisonSeriesLV = locationComparison.map((item) => item.LV);
  const comparisonSeriesFI = locationComparison.map((item) => item.FI);
  const hoveredReading =
    typeof hoveredIndex === "number" && hoveredIndex >= 0 && hoveredIndex < readings.length
      ? readings[hoveredIndex]
      : null;
  const hoveredText = hoveredReading
    ? `Aeg: ${new Date(hoveredReading.timestamp).toLocaleString("et-EE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })} | Hind: ${Number(hoveredReading.price_eur_mwh ?? 0).toFixed(2)} EUR/MWh`
    : "Liigu charti peal, et näha täpset aega ja hinda.";

  return (
    <main className="app-shell">
      <section className="panel">
        <div className="date-picker-grid">
          <label className="date-field">
            <span>Alguskuupäev</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label className="date-field">
            <span>Lõppkuupäev</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </div>

        <p className="muted">Valitud vahemik: {selectedRange}</p>
        <button className="primary-btn" onClick={loadReadings} disabled={chartLoading}>
          {chartLoading ? "Loading..." : "Load Chart"}
        </button>
      </section>

      <section className="panel">
        <label className="date-field">
          <span>Regioon</span>
          <select
            value={country}
            onChange={(event) => setCountry(event.target.value)}
          >
            <option value="EE">EE</option>
            <option value="LV">LV</option>
            <option value="FI">FI</option>
          </select>
        </label>
        <p className="muted">{countryDisplay}</p>

        <button
          className="primary-btn"
          onClick={handleSyncPrices}
          disabled={syncLoading}
        >
          {syncLoading ? "Loading..." : "Sync Prices"}
        </button>

        {syncResult && (
          <div
            className={
              syncResult.success
                ? "message message-success"
                : "message message-error"
            }
          >
            {!syncResult.success && (syncResult.error || "Tulemus puudub")}
            {syncResult.success && "Sünkroonimine õnnestus."}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Hind aja jooksul</h2>

        {chartError && <div className="message message-error">{chartError}</div>}

        {!chartError && readings.length === 0 && !chartLoading && (
          <p className="muted">Filtreeri andmeid ja vajuta "Load Chart".</p>
        )}

        {readings.length > 0 && (
          <div className="chart-wrap">
            <LineChart
              width={980}
              height={360}
              margin={{ top: 20, right: 24, bottom: 52, left: 64 }}
              onHighlightedAxisChange={(highlightedAxes) => {
                if (!Array.isArray(highlightedAxes) || highlightedAxes.length === 0) {
                  setHoveredIndex(null);
                  return;
                }

                const firstAxis = highlightedAxes[0];
                if (firstAxis && typeof firstAxis.dataIndex === "number") {
                  setHoveredIndex(firstAxis.dataIndex);
                  return;
                }

                setHoveredIndex(null);
              }}
              onHighlightChange={(highlight) => {
                if (highlight && typeof highlight.dataIndex === "number") {
                  setHoveredIndex(highlight.dataIndex);
                  return;
                }
                setHoveredIndex(null);
              }}
              axisHighlight={{ x: "line" }}
              slotProps={{ tooltip: { trigger: "axis" } }}
              xAxis={[
                {
                  id: "time",
                  data: chartTimes,
                  scaleType: "time",
                  valueFormatter: (value, context) => {
                    const date = new Date(value);
                    if (Number.isNaN(date.getTime())) return String(value);

                    if (context.location === "tick") {
                      return date.toLocaleString("et-EE", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                    }

                    return date.toLocaleString("et-EE", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    });
                  },
                  tickLabelStyle: { angle: -35, textAnchor: "end" },
                },
              ]}
              series={[
                {
                  data: chartSeries,
                  label: `price_eur_mwh (${country})`,
                  curve: "linear",
                  color: "#7dd3fc",
                  showMark: false,
                  valueFormatter: (value) => {
                    if (value == null) return "-";
                    return `${Number(value).toFixed(2)} EUR/MWh`;
                  },
                },
              ]}
              yAxis={[
                {
                  label: "EUR/MWh",
                },
              ]}
              grid={{ horizontal: true, vertical: false }}
            />
          </div>
        )}

        {readings.length > 0 && <p className="chart-detail">{hoveredText}</p>}
      </section>

      <section className="panel">
        <h2>Päevane keskmine hind valitud kuupäeva vahemikus</h2>

        {!chartError && readings.length === 0 && !chartLoading && (
          <p className="muted">Filtreeri andmeid ja vajuta "Load Chart".</p>
        )}

        {dailyAverages.length > 0 && (
          <div className="chart-wrap">
            <BarChart
              width={980}
              height={360}
              margin={{ top: 20, right: 24, bottom: 56, left: 64 }}
              xAxis={[
                {
                  scaleType: "band",
                  data: dailyAverageDays,
                  tickLabelStyle: { angle: -35, textAnchor: "end" },
                  valueFormatter: (value) => {
                    const date = new Date(`${value}T00:00:00Z`);
                    return date.toLocaleDateString("et-EE", {
                      day: "2-digit",
                      month: "2-digit",
                    });
                  },
                },
              ]}
              series={[
                {
                  data: dailyAverageValues,
                  label: `Daily average (${country})`,
                  color: "#4ade80",
                  valueFormatter: (value) => {
                    if (value == null) return "-";
                    return `${Number(value).toFixed(2)} EUR/MWh`;
                  },
                },
              ]}
              yAxis={[
                {
                  label: "EUR/MWh",
                },
              ]}
              grid={{ horizontal: true, vertical: false }}
            />
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Keskmine hind valitud asukohas</h2>

        {!chartError && readings.length === 0 && !chartLoading && (
          <p className="muted">Filtreeri andmeid ja vajuta "Load Chart".</p>
        )}

        {locationAverages.length > 0 && (
          <div className="chart-wrap">
            <BarChart
              width={980}
              height={300}
              margin={{ top: 20, right: 24, bottom: 52, left: 64 }}
              xAxis={[
                {
                  scaleType: "band",
                  data: locationAverageLabels,
                  tickLabelStyle: { angle: 0, textAnchor: "middle" },
                },
              ]}
              series={[
                {
                  data: locationAverageValues,
                  label: "Keskmine hind",
                  color: "#60a5fa",
                  valueFormatter: (value) => {
                    if (value == null) return "-";
                    return `${Number(value).toFixed(2)} EUR/MWh`;
                  },
                },
              ]}
              yAxis={[
                {
                  label: "EUR/MWh",
                },
              ]}
              grid={{ horizontal: true, vertical: false }}
            />
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Võrdle hindu asukoha järgi valitud perioodil</h2>

        {!chartError && readings.length === 0 && !chartLoading && (
          <p className="muted">Filtreeri andmeid ja vajuta "Load Chart".</p>
        )}

        {locationComparison.length > 0 && (
          <div className="chart-wrap">
            <LineChart
              width={980}
              height={340}
              margin={{ top: 20, right: 24, bottom: 52, left: 64 }}
              xAxis={[
                {
                  id: "compare-time",
                  data: comparisonTimes,
                  scaleType: "time",
                  valueFormatter: (value, context) => {
                    const date = new Date(value);
                    if (Number.isNaN(date.getTime())) return String(value);

                    if (context.location === "tick") {
                      return date.toLocaleString("et-EE", {
                        month: "2-digit",
                        day: "2-digit",
                      });
                    }

                    return date.toLocaleString("et-EE", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                  },
                  tickLabelStyle: { angle: -35, textAnchor: "end" },
                },
              ]}
              series={[
                {
                  data: comparisonSeriesEE,
                  label: "EE",
                  color: "#60a5fa",
                  showMark: false,
                },
                {
                  data: comparisonSeriesLV,
                  label: "LV",
                  color: "#f59e0b",
                  showMark: false,
                },
                {
                  data: comparisonSeriesFI,
                  label: "FI",
                  color: "#4ade80",
                  showMark: false,
                },
              ]}
              yAxis={[
                {
                  label: "EUR/MWh",
                },
              ]}
              grid={{ horizontal: true, vertical: false }}
            />
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
