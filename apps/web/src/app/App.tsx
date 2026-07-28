/* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect, useCallback, createContext, Suspense } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Types
import { User, AuthContextType } from '../types';

// Layouts
import AdminLayout from '../components/layout/AdminLayout';
import MemberLayout from '../components/layout/MemberLayout';

// Views
import LoginView from '../views/LoginView';

// Lazy Loaded Views
const ChangePasswordView = React.lazy(() => import('../views/ChangePasswordView'));
const MemberHomeView = React.lazy(() => import('../views/MemberHomeView'));
const CombinedLogsView = React.lazy(() => import('../views/CombinedLogsView'));
const AdminReportsView = React.lazy(() => import('../views/AdminReportsView'));
const ProjectsView = React.lazy(() => import('../components/projects/ProjectsView'));
const CalendarView = React.lazy(() => import('./CalendarView'));
const CheckInView = React.lazy(() => import('./CheckInView'));
const AdminUsersView = React.lazy(() => import('../components/personnel/AdminUsersView'));
const MemberPersonnelView = React.lazy(() => import('../components/personnel/MemberPersonnelView'));
const ProjectDetailView = React.lazy(() => import('../components/projects/ProjectDetailView'));

export default function App() {
  const [authState, setAuthState] = useState<{
    user: User | null;
    loading: boolean;
  }>({
    user: null,
    loading: true,
  });

  const refreshProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAuthState({ user: data.user, loading: false });
      } else {
        setAuthState({ user: null, loading: false });
      }
    } catch {
      setAuthState({ user: null, loading: false });
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        await refreshProfile();
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Đã xảy ra lỗi khi đăng nhập.' };
      }
    } catch {
      return { success: false, error: 'Không thể kết nối tới máy chủ.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.error(e);
    }
    setAuthState({ user: null, loading: false });
  };

  if (authState.loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-400">Đang tải cấu hình ứng dụng...</p>
      </div>
    );
  }

  const authContextValue: AuthContextType = {
    user: authState.user,
    loading: authState.loading,
    login,
    logout,
    refreshProfile,
  };

  return (
    <HashRouter>
      <Suspense fallback={
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-400">Đang tải...</p>
        </div>
      }>
        <Routes>
        <Route
          path="/login"
          element={
            authState.user ? (
              authState.user.mustChangePassword ? (
                <Navigate to="/change-password" replace />
              ) : authState.user.role === 'admin' ? (
                <Navigate to="/tasks" replace />
              ) : (
                <Navigate to="/" replace />
              )
            ) : (
              <LoginView login={login} />
            )
          }
        />
        <Route
          path="/change-password"
          element={
            authState.user ? (
              <ChangePasswordView auth={authContextValue} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin/dashboard"
          element={<Navigate to="/tasks" replace />}
        />
        <Route
          path="/admin/users"
          element={
            authState.user ? (
              authState.user.mustChangePassword ? (
                <Navigate to="/change-password" replace />
              ) : authState.user.role === 'admin' ? (
                <AdminLayout auth={authContextValue}>
                  <AdminUsersView auth={authContextValue} />
                </AdminLayout>
              ) : (
                <Navigate to="/" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/personnel"
          element={
            authState.user ? (
              authState.user.mustChangePassword ? (
                <Navigate to="/change-password" replace />
              ) : authState.user.role === 'admin' ? (
                <AdminLayout auth={authContextValue}>
                  <AdminUsersView auth={authContextValue} />
                </AdminLayout>
              ) : (
                <MemberLayout auth={authContextValue}>
                  <MemberPersonnelView auth={authContextValue} />
                </MemberLayout>
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/admin/email-log" element={<Navigate to="/admin/logs" replace />} />
        <Route path="/admin/audit" element={<Navigate to="/admin/logs" replace />} />
        <Route
          path="/admin/logs"
          element={
            authState.user ? (
              authState.user.mustChangePassword ? (
                <Navigate to="/change-password" replace />
              ) : authState.user.role === 'admin' ? (
                <AdminLayout auth={authContextValue}>
                  <CombinedLogsView auth={authContextValue} />
                </AdminLayout>
              ) : (
                <Navigate to="/" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/"
          element={
            authState.user ? (
              authState.user.mustChangePassword ? (
                <Navigate to="/change-password" replace />
              ) : authState.user.role === 'admin' ? (
                <Navigate to="/tasks" replace />
              ) : (
                <MemberLayout auth={authContextValue}>
                  <MemberHomeView auth={authContextValue} />
                </MemberLayout>
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/tasks"
          element={
            authState.user ? (
              authState.user.mustChangePassword ? (
                <Navigate to="/change-password" replace />
              ) : authState.user.role === 'admin' ? (
                <AdminLayout auth={authContextValue}>
                  <MemberHomeView auth={authContextValue} />
                </AdminLayout>
              ) : (
                <Navigate to="/" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/projects"
          element={
            authState.user ? (
              authState.user.mustChangePassword ? (
                <Navigate to="/change-password" replace />
              ) : authState.user.role === 'admin' ? (
                <AdminLayout auth={authContextValue}>
                  <ProjectsView auth={authContextValue} />
                </AdminLayout>
              ) : (
                <MemberLayout auth={authContextValue}>
                  <ProjectsView auth={authContextValue} />
                </MemberLayout>
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/projects/:id"
          element={
            authState.user ? (
              authState.user.mustChangePassword ? (
                <Navigate to="/change-password" replace />
              ) : authState.user.role === 'admin' ? (
                <AdminLayout auth={authContextValue}>
                  <ProjectDetailView auth={authContextValue} />
                </AdminLayout>
              ) : (
                <MemberLayout auth={authContextValue}>
                  <ProjectDetailView auth={authContextValue} />
                </MemberLayout>
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/admin/reports" element={ authState.user ? ( authState.user.mustChangePassword ? ( <Navigate to="/change-password" replace /> ) : authState.user.role === 'admin' ? ( <AdminLayout auth={authContextValue}> <AdminReportsView auth={authContextValue} /> </AdminLayout> ) : ( <Navigate to="/" replace /> ) ) : ( <Navigate to="/login" replace /> ) } />
        <Route path="/calendar" element={ authState.user ? ( authState.user.mustChangePassword ? ( <Navigate to="/change-password" replace /> ) : authState.user.role === 'admin' ? ( <AdminLayout auth={authContextValue}> <CalendarView auth={authContextValue} /> </AdminLayout> ) : ( <MemberLayout auth={authContextValue}> <CalendarView auth={authContextValue} /> </MemberLayout> ) ) : ( <Navigate to="/login" replace /> ) } />
        
        <Route path="/check-in" element={ authState.user ? ( authState.user.mustChangePassword ? ( <Navigate to="/change-password" replace /> ) : authState.user.role === 'admin' ? ( <Navigate to="/admin/reports" replace /> ) : ( <MemberLayout auth={authContextValue}> <CheckInView auth={authContextValue} /> </MemberLayout> ) ) : ( <Navigate to="/login" replace /> ) } />
        <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
