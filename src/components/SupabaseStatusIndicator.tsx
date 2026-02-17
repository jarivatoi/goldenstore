import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SupabaseStatusIndicatorProps {
  className?: string;
}

/**
 * SUPABASE STATUS INDICATOR COMPONENT
 * ===================================
 * 
 * Shows a big glowing dot to indicate Supabase connection status
 */
const SupabaseStatusIndicator: React.FC<SupabaseStatusIndicatorProps> = ({ className = '' }) => {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('connecting');
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  useEffect(() => {
    let mounted = true;
    let checkInterval: NodeJS.Timeout;

    const checkSupabaseStatus = async () => {
      if (!mounted) return;

      try {
        if (!supabase) {
          setStatus('disconnected');
          setLastChecked(new Date());
          return;
        }

        setStatus('connecting');
        
        // Test connection with a simple query
        const { data, error } = await Promise.race([
          supabase.from('price_items').select('id').limit(1),
          new Promise<any>((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), 5000)
          )
        ]);

        if (!mounted) return;

        if (error) {
          if (error.message?.includes('timeout') || 
              error.message?.includes('fetch') || 
              error.message?.includes('Failed to fetch')) {
            setStatus('error');
          } else {
            setStatus('error');
          }
        } else {
          setStatus('connected');
        }
        
        setLastChecked(new Date());
      } catch (err) {
        if (!mounted) return;
        setStatus('error');
        setLastChecked(new Date());
      }
    };

    // Initial check
    checkSupabaseStatus();

    // Check every 30 seconds
    checkInterval = setInterval(checkSupabaseStatus, 30000);

    // Also check when coming back online
    const handleOnline = () => {
      if (mounted) {
        checkSupabaseStatus();
      }
    };

    const handleOffline = () => {
      if (mounted) {
        setStatus('disconnected');
        setLastChecked(new Date());
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      mounted = false;
      clearInterval(checkInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          color: 'bg-green-500',
          glow: 'shadow-green-500/50',
          pulse: '',
          title: 'Connected to Supabase'
        };
      case 'connecting':
        return {
          color: 'bg-yellow-500',
          glow: 'shadow-yellow-500/50',
          pulse: 'animate-pulse',
          title: 'Connecting to Supabase...'
        };
      case 'disconnected':
        return {
          color: 'bg-gray-500',
          glow: 'shadow-gray-500/50',
          pulse: '',
          title: 'Offline - Using local storage'
        };
      case 'error':
        return {
          color: 'bg-red-500',
          glow: 'shadow-red-500/50',
          pulse: 'animate-pulse',
          title: 'Connection error - Using local storage'
        };
      default:
        return {
          color: 'bg-gray-500',
          glow: 'shadow-gray-500/50',
          pulse: '',
          title: 'Unknown status'
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div 
      className={`relative ${className}`}
      title={`${statusConfig.title} (Last checked: ${lastChecked.toLocaleTimeString()})`}
    >
      {/* Big glowing dot */}
      <div 
        className={`
          w-4 h-4 rounded-full 
          ${statusConfig.color} 
          shadow-lg ${statusConfig.glow}
          ${statusConfig.pulse}
          transition-all duration-300
        `}
        style={{
          boxShadow: `0 0 20px ${
            status === 'connected' ? '#10b981' :
            status === 'connecting' ? '#f59e0b' :
            status === 'error' ? '#ef4444' :
            '#6b7280'
          }`
        }}
      />
      
      {/* Outer glow ring for extra emphasis */}
      <div 
        className={`
          absolute inset-0 w-4 h-4 rounded-full 
          ${statusConfig.color} 
          opacity-30 
          ${statusConfig.pulse}
          transition-all duration-300
        `}
        style={{
          transform: 'scale(1.5)',
          filter: 'blur(2px)'
        }}
      />
    </div>
  );
};

export default SupabaseStatusIndicator;