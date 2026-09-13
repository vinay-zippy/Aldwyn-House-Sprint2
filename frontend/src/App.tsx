import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { UpcomingArrivalsPage } from './pages/UpcomingArrivalsPage'
import { Guest360Page } from './pages/Guest360Page'
import { RoomsPage } from './pages/RoomsPage'
import { AmenitiesPage } from './pages/AmenitiesPage'
import { AIAssistancePage } from './pages/AIAssistancePage'
import { SettingsPage } from './pages/SettingsPage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="arrivals" element={<UpcomingArrivalsPage />} />
          <Route path="guests" element={<Guest360Page />} />
          <Route path="guests/:guestId" element={<Guest360Page />} />
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="amenities" element={<AmenitiesPage />} />
          <Route path="ai-assistance" element={<AIAssistancePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
