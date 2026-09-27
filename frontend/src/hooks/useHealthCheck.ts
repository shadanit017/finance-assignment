import { useState, useEffect } from 'react';
import { healthApi } from '../services/api';
import { HealthStatus } from '../types';

export function useHealthCheck() {
  const [backendStatus, setBackendStatus] = useState<'Checking' | 'Connected' | 'Error'>('Checking');
  const [dbStatus, setDbStatus] = useState<'Checking' | 'Connected' | 'Error'>('Checking');
  const [details, setDetails] = useState<{ backend?: HealthStatus; db?: HealthStatus }>({});
  const [loading, setLoading] = useState<boolean>(true);

  const performHealthCheck = async () => {
    setLoading(true);
    try {
      const appHealth = await healthApi.checkAppHealth();
      if (appHealth.status === 'ok') {
        setBackendStatus('Connected');
        setDetails((prev) => ({ ...prev, backend: appHealth }));
      } else {
        setBackendStatus('Error');
      }
    } catch {
      setBackendStatus('Error');
    }

    try {
      const dbHealth = await healthApi.checkDbHealth();
      if (dbHealth.status === 'ok' && dbHealth.database === 'connected') {
        setDbStatus('Connected');
        setDetails((prev) => ({ ...prev, db: dbHealth }));
      } else {
        setDbStatus('Error');
      }
    } catch {
      setDbStatus('Error');
    }

    setLoading(false);
  };

  useEffect(() => {
    performHealthCheck();
    const interval = setInterval(performHealthCheck, 10000);
    return () => clearInterval(interval);
  }, []);

  return {
    backendStatus,
    dbStatus,
    details,
    loading,
    refresh: performHealthCheck,
  };
}
