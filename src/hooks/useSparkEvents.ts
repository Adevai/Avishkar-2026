import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

/**
 * Real-time event stream via Server-Sent Events.
 *
 * Opens ONE EventSource for the whole app (mounted once in Dashboard),
 * receiving instant pushes for: application stage changes, new job postings,
 * new MoUs, and general notifications. Each event raises the standard toast
 * so users see updates without polling.
 */

export interface SparkEventPayload {
  type: 'application_update' | 'new_job' | 'new_mou' | 'new_problem' | 'assessment_result' | 'notification';
  title: string;
  message: string;
  targetUserId?: string | null;
  data?: Record<string, any>;
  at: string;
}

export function useSparkEvents() {
  const { setNotification, student } = useApp();
  const sourceRef = useRef<EventSource | null>(null);
  const refreshJobsRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Build the SSE URL — include the current user so targeted events route correctly
    const url = `/api/events?userId=${encodeURIComponent(student.id)}`;
    const es = new EventSource(url);
    sourceRef.current = es;

    es.addEventListener('spark', (e) => {
      try {
        const evt = JSON.parse((e as MessageEvent).data) as SparkEventPayload;
        // Show a toast for every relevant event
        setNotification(`${evt.title}: ${evt.message}`);

        // New jobs → nudge other tabs/components to refetch via storage event
        if (evt.type === 'new_job') {
          localStorage.setItem('spark_jobs_dirty', String(Date.now()));
        }
      } catch {
        // Malformed frame — ignore
      }
    });

    es.onerror = () => {
      // EventSource auto-reconnects; nothing to do here
    };

    return () => {
      es.close();
      sourceRef.current = null;
    };
  }, [student.id, setNotification]);
}
