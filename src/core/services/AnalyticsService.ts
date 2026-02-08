import { logEvent } from 'firebase/analytics';
import { analytics } from '../firebase';

/**
 * AnalyticsService provides a unified interface for tracking user interactions.
 * This is used to gather "Traction Signals" for the project.
 */
export const AnalyticsService = {
  /**
   * Log a custom event to Google Analytics.
   * @param eventName The name of the event (e.g., 'click_upgrade_pro')
   * @param params Additional metadata for the event
   */
  logCustomEvent: (eventName: string, params?: Record<string, unknown>) => {
    if (analytics) {
      logEvent(analytics, eventName, params);
      if (import.meta.env.DEV) {
        console.log(`[Analytics] Event logged: ${eventName}`, params);
      }
    } else if (import.meta.env.DEV) {
      console.warn(`[Analytics] Analytics not initialized. Event skipped: ${eventName}`);
    }
  },

  /**
   * Specifically track intent for the "Pro" upgrade.
   * Part of the "Illusion of Monetization" strategy.
   */
  trackUpgradeIntent: (source: string, plan: string = '$9/month') => {
    AnalyticsService.logCustomEvent('intent_upgrade_pro', {
      source,
      plan,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Track when someone joins the waitlist.
   */
  trackWaitlistJoin: (source: string) => {
    AnalyticsService.logCustomEvent('join_waitlist', {
      source,
      timestamp: new Date().toISOString(),
    });
  },
};
