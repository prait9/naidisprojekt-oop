import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

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

  const handleImport = async () => {
    setImportLoading(true);
    setImportResult(null);
    try {
      const response = await fetch("http://localhost:3000/api/import/json", {
        method: "POST",
      });
      const data = await response.json();
      setImportResult(data);
    } catch (err) {
      setImportResult({ success: false, error: err.message });
    } finally {
      setImportLoading(false);
    }
  };


}

export default App;
