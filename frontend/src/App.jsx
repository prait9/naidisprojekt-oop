import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
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
    } catch (err) {
      setSyncResult({ success: false, error: err.message });
    } finally {
      setSyncLoading(false);
    }
  };

  const selectedRange =
    startDate && endDate ? `${startDate} - ${endDate}` : "Vali kuupäevavahemik";
  const countryDisplay = country ? `Valitud riik: ${country}` : "Vali riik";

  return (
    <main className="elektrihindade-app">
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
            {syncResult.message || syncResult.error || "Tulemus puudub"}

            {syncResult.summary && (
              <div className="summary">
                {Object.entries(syncResult.summary).map(([key, value]) => (
                  <div key={key} className="summary-item">
                    <span>{key}</span>
                    <strong>{String(value)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
