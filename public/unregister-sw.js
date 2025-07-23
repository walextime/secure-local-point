// Service Worker Unregister Script
// Run this in the browser console to unregister all service workers

async function unregisterAllServiceWorkers() {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log('Found service worker registrations:', registrations.length);
      
      for (const registration of registrations) {
        const unregistered = await registration.unregister();
        console.log('Unregistered service worker:', unregistered);
      }
      
      // Clear all caches
      const cacheNames = await caches.keys();
      console.log('Found caches:', cacheNames);
      
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log('Deleted cache:', cacheName);
      }
      
      console.log('All service workers unregistered and caches cleared');
      return true;
    } catch (error) {
      console.error('Error unregistering service workers:', error);
      return false;
    }
  } else {
    console.log('Service Worker not supported');
    return false;
  }
}

// Auto-run the unregister function
unregisterAllServiceWorkers().then(success => {
  if (success) {
    console.log('✅ Service workers cleared successfully. Please refresh the page.');
  } else {
    console.log('❌ Failed to clear service workers');
  }
}); 