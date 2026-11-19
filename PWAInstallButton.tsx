import React, {useState} from 'react';
import {Download, Share, Smartphone, WifiOff, X} from 'lucide-react';
import {useOnlineStatus, usePWAInstall} from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg border border-white/20 bg-white/5 text-xs font-medium text-white hover:bg-white hover:text-black transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        title="Install Offline App (Android & iOS)"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{isIOS ? 'Install iOS' : 'Install App'}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Install Offline Mobile App"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#0e0e0e] border border-white/15 p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl border border-white/20 bg-white/5 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-white">
                    Install Standalone Offline App
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Works 100% offline on Android &amp; iOS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close install instructions"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm text-neutral-300">
              <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10">
                <div className="flex items-center gap-2 font-medium text-white mb-1.5">
                  <Share className="w-4 h-4" />
                  <span>iPhone &amp; iPad (Safari)</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-xs text-neutral-300 leading-relaxed">
                  <li>Tap the Share icon at the bottom of Safari.</li>
                  <li>Scroll down and tap Add to Home Screen.</li>
                  <li>Tap Add to launch full-screen offline.</li>
                </ol>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10">
                <div className="flex items-center gap-2 font-medium text-white mb-1.5">
                  <Smartphone className="w-4 h-4" />
                  <span>Android (Chrome / Edge / Samsung Internet)</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-xs text-neutral-300 leading-relaxed">
                  <li>Open the browser menu (three dots) in the top corner.</li>
                  <li>Tap Install app or Add to Home screen.</li>
                  <li>Confirm Install for standalone offline editing.</li>
                </ol>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-18 lg:bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-white text-black px-3 py-1.5 text-xs font-semibold shadow-xl border border-black/15">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline Mode — Local Engine Active</span>
    </div>
  );
};
