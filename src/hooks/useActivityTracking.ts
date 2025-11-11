import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export const useActivityTracking = () => {
  const sessionId = useRef(uuidv4());
  const location = useLocation();
  const startTimeRef = useRef<number | null>(null);

  const trackActivity = async (eventType: string, eventData?: Record<string, unknown>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('user_activity').insert({
        user_id: user?.id || null,
        session_id: sessionId.current,
        event_type: eventType,
        event_data: eventData,
        page_url: window.location.pathname,
      });
    } catch (error) {
      console.error('Activity tracking error:', error);
    }
  };

  useEffect(() => {
    // initial page view + time start
    startTimeRef.current = performance.now();
    trackActivity('page_view');
  }, []);

  useEffect(() => {
    // Track route changes as page_view and reset timer
    if (startTimeRef.current !== null) {
      const elapsedMs = performance.now() - startTimeRef.current;
      trackActivity('time_on_page', { ms: Math.round(elapsedMs) });
    }
    startTimeRef.current = performance.now();
    trackActivity('page_view', { path: location.pathname });
  }, [location.pathname]); 

    // Click tracking via data-track attributes
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const el = target.closest<HTMLElement>('[data-track]');
      if (!el) return;
      const eventName = el.getAttribute('data-track') || 'click';
      const meta = el.getAttribute('data-track-meta');
      let payload: Record<string, unknown> | undefined;
      try {
        payload = meta ? JSON.parse(meta) : undefined;
      } catch {
        payload = meta ? { meta } : undefined;
      }
      trackActivity(eventName, {
        ...payload,
        tag: el.tagName,
        id: el.id || undefined,
        classes: el.className || undefined,
      });
    };
    window.addEventListener('click', handleClick, { capture: true });
    return () => window.removeEventListener('click', handleClick, { capture: true as unknown as boolean });
  }, []);

  useEffect(() => {
    const beforeUnload = () => {
      if (startTimeRef.current !== null) {
        const elapsedMs = performance.now() - startTimeRef.current;
        navigator.sendBeacon?.(
          `${window.location.origin}/beacon`, 
          new Blob([JSON.stringify({ event: 'time_on_page', ms: Math.round(elapsedMs) })], { type: 'application/json' })
        );
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);

  // Optional: expose global helper
  useEffect(() => {
    (window as unknown as { trackActivity?: typeof trackActivity }).trackActivity = trackActivity;
  }, []);

  return { trackActivity };
};
