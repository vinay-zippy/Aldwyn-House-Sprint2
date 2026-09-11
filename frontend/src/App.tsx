import UpcomingArrivals from './components/upcoming-arrivals/UpcomingArrivals'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <h1>Aldwyn House</h1>
            <span>Hotel Operations</span>
          </div>
        </div>

        <nav className="navigation" aria-label="Main navigation">
          <a className="nav-item active" href="#overview">
            <span>Overview</span>
          </a>
          <a className="nav-item" href="#arrivals">
            <span>Arrivals</span>
          </a>
          <a className="nav-item" href="#departures">
            <span>Departures</span>
          </a>
          <a className="nav-item" href="#guests">
            <span>Guests</span>
          </a>
          <a className="nav-item" href="#rooms">
            <span>Rooms</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" />
          <span>Front desk online</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="topbar-label">Today</p>
            <h2>Good morning, Front Desk</h2>
          </div>

          <div className="property-selector">
            <span className="property-dot" />
            <span>Aldwyn House</span>
          </div>
        </header>

        <section className="dashboard-content" id="overview">
          <div className="welcome-section">
            <div>
              <p className="page-eyebrow">Operations overview</p>
              <h2>Today at Aldwyn House</h2>
              <p>
                Keep track of guest movement and what needs attention at the
                front desk.
              </p>
            </div>
          </div>

          <div className="summary-grid">
            <article className="summary-card">
              <span className="summary-label">Guest arrivals</span>
              <strong>Upcoming</strong>
              <span className="summary-note">Next 7 days</span>
            </article>

            <article className="summary-card">
              <span className="summary-label">Front desk</span>
              <strong>Ready</strong>
              <span className="summary-note">Operations active</span>
            </article>

            <article className="summary-card">
              <span className="summary-label">Property</span>
              <strong>Open</strong>
              <span className="summary-note">Aldwyn House</span>
            </article>
          </div>

          <div id="arrivals">
            <UpcomingArrivals />
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
