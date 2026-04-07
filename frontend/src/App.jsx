import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/health')
        if (!response.ok) {
          throw new Error('Backend pole saadaval')
        }
        const data = await response.json()
        setStatus(data)
        setError(null)
      } catch (err) {
        setError(err.message)
        setStatus(null)
      } finally {
        setLoading(false)
      }
    }

    checkHealth()
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Energia rakendus</h1>
      <h2>Backend staatus</h2>
      
      {loading && <p>Otsin backendist...</p>}
      
      {error && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc',
          borderRadius: '4px',
          color: '#c00'
        }}>
          <strong>Viga:</strong> {error}
        </div>
      )}
      
      {status && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#efe', 
          border: '1px solid #cfc',
          borderRadius: '4px',
          color: '#060'
        }}>
          <strong>Backend OK</strong>
          <ul>
            <li>App: {status.status}</li>
            <li>Andmebaas: {status.db}</li>
          </ul>
        </div>
      )}
    </div>
  )
}

export default App
