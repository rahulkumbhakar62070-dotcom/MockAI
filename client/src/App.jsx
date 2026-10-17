import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { MediaProvider } from './context/MediaContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import InterviewSetup from './pages/InterviewSetup';
import InterviewSession from './pages/InterviewSession';
import InterviewReport from './pages/InterviewReport';
import InterviewHistory from './pages/InterviewHistory';
import PerformanceAnalytics from './pages/PerformanceAnalytics';
import DeviceSetup from './pages/DeviceSetup';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <MediaProvider>
          <div className="min-h-screen bg-[#F8F6F0] text-[#252923] flex flex-col font-sans selection:bg-[#DCE8DC] selection:text-[#245C46]">
          {/* Toast notifications styled for editorial palette */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#FFFFFF',
                color: '#252923',
                border: '1px solid #E8E4DA',
                borderRadius: '14px',
                fontSize: '13px',
                fontWeight: '500',
                boxShadow: '0 8px 24px -4px rgba(37, 41, 35, 0.08)',
              },
              success: {
                iconTheme: {
                  primary: '#245C46',
                  secondary: '#FFFFFF',
                },
              },
              error: {
                iconTheme: {
                  primary: '#D94848',
                  secondary: '#FFFFFF',
                },
              },
            }}
          />

          {/* Top navigation */}
          <Navbar />

          {/* Main page content */}
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              
              {/* Public-only routes: redirect if already authenticated */}
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <Login />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicOnlyRoute>
                    <Signup />
                  </PublicOnlyRoute>
                }
              />

              {/* Protected routes: requires valid authenticated session */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/interview/history"
                element={
                  <ProtectedRoute>
                    <InterviewHistory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <InterviewHistory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/interview/analytics"
                element={
                  <ProtectedRoute>
                    <PerformanceAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <PerformanceAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/interview/setup"
                element={
                  <ProtectedRoute>
                    <InterviewSetup />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/interview/session/:id"
                element={
                  <ProtectedRoute>
                    <InterviewSession />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/interview/room/:id"
                element={
                  <ProtectedRoute>
                    <InterviewSession />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/interview/:id"
                element={
                  <ProtectedRoute>
                    <InterviewSession />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/interview/:id/report"
                element={
                  <ProtectedRoute>
                    <InterviewReport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/interview/session/:id/report"
                element={
                  <ProtectedRoute>
                    <InterviewReport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/interview/devices"
                element={
                  <ProtectedRoute>
                    <DeviceSetup />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/interview/:id/device-check"
                element={
                  <ProtectedRoute>
                    <DeviceSetup />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/interview/setup/devices"
                element={
                  <ProtectedRoute>
                    <DeviceSetup />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Footer */}
          <Footer />
        </div>
        </MediaProvider>
      </AuthProvider>
    </Router>
  );
}
