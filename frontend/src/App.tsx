import type React from 'react'
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
import { WalkInGuestPage } from './pages/WalkInGuestPage'
import { LoginPage } from './pages/LoginPage'
import { getRole, isAuthenticated } from './services/auth'

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  if (roles && !roles.includes(getRole() ?? '')) return <Navigate to={getRole() === 'HOUSEKEEPING' ? '/rooms' : '/dashboard'} replace />
  return children
}
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to={getRole() === 'HOUSEKEEPING' ? '/rooms' : '/dashboard'} replace />} />
          <Route path="dashboard" element={<ProtectedRoute roles={['FRONT_DESK']}><DashboardPage /></ProtectedRoute>} />
          <Route path="arrivals" element={<ProtectedRoute roles={['FRONT_DESK']}><UpcomingArrivalsPage /></ProtectedRoute>} />
          <Route path="guests" element={<ProtectedRoute roles={['FRONT_DESK']}><Guest360Page /></ProtectedRoute>} />
          <Route path="guests/:guestId" element={<ProtectedRoute roles={['FRONT_DESK']}><Guest360Page /></ProtectedRoute>} />
          <Route path="walk-in-guest" element={<ProtectedRoute roles={['FRONT_DESK']}><WalkInGuestPage /></ProtectedRoute>} />
          <Route path="rooms" element={<ProtectedRoute><RoomsPage /></ProtectedRoute>} />
          <Route path="amenities" element={<ProtectedRoute roles={['FRONT_DESK']}><AmenitiesPage /></ProtectedRoute>} />
          <Route path="ai-assistance" element={<ProtectedRoute roles={['FRONT_DESK']}><AIAssistancePage /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute roles={['FRONT_DESK']}><SettingsPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
