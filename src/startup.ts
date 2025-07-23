import { initializeDatabase } from '@/lib/dexieDb';
import { initializeApp as coreInitializeApp } from '@/lib/appInitialization';

/**
 * Centralized application startup logic.
 * This function should be called once before the React app is rendered.
 */
export async function startup() {
  console.log('--- [App Startup] Initializing Database ---');
  try {
    await initializeDatabase();
    console.log('--- [App Startup] Database Initialized ---');
  } catch (error) {
    console.error('--- [App Startup] CRITICAL: Database initialization failed ---', error);
    // In a real app, you might want to render a fatal error page here.
  }

  console.log('--- [App Startup] Initializing Core App Logic ---');
  try {
    await coreInitializeApp();
    console.log('--- [App Startup] Core App Initialized ---');
  } catch (error) {
    console.error('--- [App Startup] CRITICAL: Core app initialization failed ---', error);
  }
  console.log('--- [App Startup] Initialization Complete ---');
} 