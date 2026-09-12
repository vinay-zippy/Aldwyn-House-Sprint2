import { useCallback, useEffect, useState } from 'react'
import {
  getUpcomingArrivals,
  type UpcomingArrival,
} from '../../services/reservationsApi'
import './UpcomingArrivals.css'

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function UpcomingArrivals() {
  const [arrivals, setArrivals] = useState<UpcomingArrival[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadArrivals = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await getUpcomingArrivals()
      setArrivals(data)
    } catch {
      setError('Unable to load upcoming arrivals.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadArrivals()
  }, [loadArrivals])

  return (
    <section className="upcoming-arrivals">
      <div className="arrivals-header">
        <div>
          <p className="section-eyebrow">Front desk</p>
          <h2>Upcoming arrivals</h2>
          <p className="section-description">
            Guests expected to check in during the upcoming days.
          </p>
        </div>

        <div className="arrival-count">
          <strong>{loading ? '—' : arrivals.length}</strong>
          <span>arrivals</span>
        </div>
      </div>

      {loading && (
        <div className="arrivals-state">
          <div className="loading-spinner" />
          <p>Loading upcoming arrivals...</p>
        </div>
      )}

      {!loading && error && (
        <div className="arrivals-state error-state">
          <p>{error}</p>
          <button type="button" onClick={() => void loadArrivals()}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && arrivals.length === 0 && (
        <div className="arrivals-state">
          <p>No upcoming guest arrivals.</p>
        </div>
      )}

      {!loading && !error && arrivals.length > 0 && (
        <div className="arrivals-table-wrapper">
          <table className="arrivals-table">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Arrival</th>
                <th>Departure</th>
                <th>Room</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {arrivals.map((arrival) => (
                <tr key={arrival.id}>
                  <td>
                    <div className="guest-cell">
                      <div className="guest-avatar">
                        {arrival.guest_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong>{arrival.guest_name}</strong>
                        <span>{arrival.guest_id}</span>
                      </div>
                    </div>
                  </td>

                  <td>{formatDate(arrival.check_in)}</td>
                  <td>{formatDate(arrival.check_out)}</td>
                  <td>{arrival.room_number ?? 'Not assigned'}</td>
                  <td>
                    <span
                      className={`status-badge status-${arrival.status.toLowerCase()}`}
                    >
                      {arrival.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default UpcomingArrivals
