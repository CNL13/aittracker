/* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect, useCallback, createContext, Suspense } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import { AppSkeleton, PageSkeleton } from '../components/ui/Skeletons';
import { prefetchData } from '../utils/apiCache';
import { prefetchRouteData } from '../utils/prefetchRoutes';

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

  const refreshProfile = useCallback(async (useEarlyFetch = false) => {
    try {
      let data: any = null;
      // Use early fetch from index.html if available (first load only)
      if (useEarlyFetch && (window as any).__PREFETCH_AUTH) {
        data = await (window as any).__PREFETCH_AUTH;
        (window as any).__PREFETCH_AUTH = null; // Use only once
      }
      if (!data) {
        const res = await fetch('/api/users/me', { credentials: 'include' });
        if (res.ok) {
          data = await res.json();
        }
      }
      if (data?.user) {
        setAuthState({ user: data.user, loading: false });
      } else {
        setAuthState({ user: null, loading: false });
      }
    } catch {
      setAuthState({ user: null, loading: false });
    }
  }, []);

  useEffect(() => {
    refreshProfile(true); // Use early fetch on first load
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
        // Prefetch common data in background after login
        prefetchData('/api/projects/list');
        prefetchData('/api/users/list?limit=100&status=active');
        prefetchRouteData('/tasks', data.user?.role);
        prefetchRouteData('/projects', data.user?.role);
        prefetchRouteData('/calendar', data.user?.role);
        prefetchRouteData('/check-in', data.user?.role);
        if (data.user?.role === 'admin') {
          prefetchRouteData('/admin/users', data.user?.role);
          prefetchRouteData('/admin/dashboard', data.user?.role);
        }
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
    return <AppSkeleton />;
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
      <Suspense fallback={<PageSkeleton />}>
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
