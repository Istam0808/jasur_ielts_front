/**
 * Cache Debugger Component
 * 
 * Development utility to visualize and test smart cache functionality
 * Only renders in development mode
 */

'use client';

import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import SmartCache from '@/utils/smartCache';

const CacheDebugger = () => {
  const { getCacheStatus, refreshUserData } = useUser();
  const [isVisible, setIsVisible] = useState(false);
  const [cacheStatus, setCacheStatus] = useState(null);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const updateCacheStatus = () => {
    const status = getCacheStatus?.();
    setCacheStatus(status);
  };

  const formatAge = (ageMs) => {
    if (!ageMs) return 'N/A';
    const seconds = Math.floor(ageMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatDuration = (durationMs) => {
    if (!durationMs) return 'N/A';
    const minutes = Math.floor(durationMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 9999,
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      {!isVisible ? (
        <button
          onClick={() => {
            setIsVisible(true);
            updateCacheStatus();
          }}
          style={{
            background: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 12px',
            cursor: 'pointer'
          }}
        >
          Cache Debug
        </button>
      ) : (
        <div style={{
          background: '#1e1e1e',
          color: '#d4d4d4',
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '16px',
          minWidth: '300px',
          maxWidth: '400px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            borderBottom: '1px solid #333',
            paddingBottom: '8px'
          }}>
            <h4 style={{ margin: 0, color: '#569cd6' }}>Smart Cache Status</h4>
            <button
              onClick={() => setIsVisible(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#d4d4d4',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ×
            </button>
          </div>

          {cacheStatus && (
            <div>
              <div style={{ marginBottom: '12px' }}>
                <h5 style={{ margin: '0 0 4px 0', color: '#dcdcaa' }}>Learning Hours</h5>
                <div style={{ paddingLeft: '8px' }}>
                  <div>Status: <span style={{ color: cacheStatus.learning_hours.valid ? '#4ec9b0' : '#f44747' }}>
                    {cacheStatus.learning_hours.valid ? 'Valid' : 'Expired'}
                  </span></div>
                  <div>Age: {formatAge(cacheStatus.learning_hours.age)}</div>
                  <div>Max Age: {formatDuration(cacheStatus.learning_hours.maxAge)}</div>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <h5 style={{ margin: '0 0 4px 0', color: '#dcdcaa' }}>Profile Data</h5>
                <div style={{ paddingLeft: '8px' }}>
                  <div>Status: <span style={{ color: cacheStatus.profile_data.valid ? '#4ec9b0' : '#f44747' }}>
                    {cacheStatus.profile_data.valid ? 'Valid' : 'Expired'}
                  </span></div>
                  <div>Age: {formatAge(cacheStatus.profile_data.age)}</div>
                  <div>Max Age: {formatDuration(cacheStatus.profile_data.maxAge)}</div>
                </div>
              </div>
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: '8px',
            marginTop: '12px',
            borderTop: '1px solid #333',
            paddingTop: '8px'
          }}>
            <button
              onClick={updateCacheStatus}
              style={{
                background: '#007acc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              Refresh Status
            </button>
            <button
              onClick={() => {
                SmartCache.clearCache();
                updateCacheStatus();
              }}
              style={{
                background: '#f44747',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              Clear Cache
            </button>
            <button
              onClick={async () => {
                if (refreshUserData) {
                  await refreshUserData(true);
                  updateCacheStatus();
                }
              }}
              style={{
                background: '#4ec9b0',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              Force Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CacheDebugger;
