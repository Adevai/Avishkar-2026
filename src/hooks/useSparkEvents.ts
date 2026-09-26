import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { getToken } from '../services/api';

/**
 * Real-time event stream via Server-Sent Events.
 *
 * Opens ONE EventSource for the whole app (mounted once in Dashboard),
 * receiving instant pushes for: application stage changes, new job postings,
 * new MoUs, verification-queue updates, and general notifications. Each event
 * raises the standard toast so users see updates without polling.
 */

export interface SparkEventPayload {
  type: 'application_update' | 'new_job' | 'new_mou' | 'new_problem' | 'assessment_result' | 'verification_queue' | 'notification';
  title: string;
  message: string;
  targetUserId?: string | null;
  targetRole?: string | null;
  data?: Record<string, any>;
  at: string;
}

/** Window event fired whenever a verification-queue push arrives (SSE consumers re-fetch). */
export const SPARK_QUEUE_EVENT = 'spark:verification-queue';

export function useSparkEvents() {
  const { setNotification, student } = useApp();
  const sourceRef = useRef<EventSource | null>(null);
  const refreshJobsRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Build the SSE URL — include the current user so targeted events route
    // correctly, and the bearer token so the server can resolve the portal
    // role for role-targeted desks (college TPO / government admin).
    const token = getToken();
    const qs = new URLSearchParams({ userId: student.id || '' });
    if (token) qs.set('token', token);
    const url = `/api/events?${qs.toString()}`;
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

        // Verification-queue updates → badge/desk refresh via window event
        if (evt.type === 'verification_queue') {
          window.dispatchEvent(new CustomEvent(SPARK_QUEUE_EVENT, { detail: evt }));
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
