import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Skeleton } from '@/components/ui/Skeleton';

// Lazy-loaded route components for optimized code-splitting
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const LiveMapPage = lazy(() => import('@/pages/LiveMapPage').then((m) => ({ default: m.LiveMapPage })));
const VehiclesPage = lazy(() => import('@/pages/VehiclesPage').then((m) => ({ default: m.VehiclesPage })));
const VehicleDetailsPage = lazy(() => import('@/pages/VehicleDetailsPage').then((m) => ({ default: m.VehicleDetailsPage })));
const TelemetryPage = lazy(() => import('@/pages/TelemetryPage').then((m) => ({ default: m.TelemetryPage })));
const GeofencesPage = lazy(() => import('@/pages/GeofencesPage').then((m) => ({ default: m.GeofencesPage })));
const AlertsPage = lazy(() => import('@/pages/AlertsPage').then((m) => ({ default: m.AlertsPage })));
const PerformancePage = lazy(() => import('@/pages/PerformancePage').then((m) => ({ default: m.PerformancePage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

const PageSuspenseFallback: React.FC = () => (
  <div className="space-y-6 p-2">
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-60" />
      <Skeleton className="h-8 w-28" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl" />
      ))}
    </div>
    <Skeleton className="h-80 w-full rounded-xl" />
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<PageSuspenseFallback />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<PageSuspenseFallback />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: 'live-map',
        element: (
          <Suspense fallback={<PageSuspenseFallback />}>
            <LiveMapPage />
          </Suspense>
        ),
      },
      {
        path: 'vehicles',
        element: (
          <Suspense fallback={<PageSuspenseFallback />}>
            <VehiclesPage />
          </Suspense>
        ),
      },
      {
        path: 'vehicles/:id',
        element: (
          <Suspense fallback={<PageSuspenseFallback />}>
            <VehicleDetailsPage />
          </Suspense>
        ),
      },
      {
        path: 'telemetry',
        element: (
          <Suspense fallback={<PageSuspenseFallback />}>
            <TelemetryPage />
          </Suspense>
        ),
      },
      {
        path: 'geofences',
        element: (
          <Suspense fallback={<PageSuspenseFallback />}>
            <GeofencesPage />
          </Suspense>
        ),
      },
      {
        path: 'alerts',
        element: (
          <Suspense fallback={<PageSuspenseFallback />}>
            <AlertsPage />
          </Suspense>
        ),
      },
      {
        path: 'performance',
        element: (
          <Suspense fallback={<PageSuspenseFallback />}>
            <PerformancePage />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<PageSuspenseFallback />}>
            <SettingsPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<PageSuspenseFallback />}>
        <NotFoundPage />
      </Suspense>
    ),
  },
]);
