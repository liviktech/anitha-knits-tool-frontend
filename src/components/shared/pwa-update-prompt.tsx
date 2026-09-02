import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Poll for a new service worker periodically so long-lived open tabs
      // eventually notice an update instead of only checking on full reload.
      if (!registration) return;
      setInterval(() => registration.update(), 60 * 60 * 1000);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
      <span className="text-sm font-medium text-gray-800">A new version is available</span>
      <Button
        size="sm"
        className="h-8 gap-1.5 rounded-full bg-[#004D40] text-white hover:bg-[#00332a]"
        onClick={() => updateServiceWorker(true)}
      >
        <RefreshCw className="h-3.5 w-3.5" /> Reload
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        aria-label="Dismiss"
        onClick={() => setNeedRefresh(false)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
