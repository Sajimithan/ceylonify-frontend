import { useEffect } from "react";

export function useSmartPoll(
  startPolling: (interval: number) => void,
  stopPolling: () => void,
  interval: number,
) {
  useEffect(() => {
    function sync() {
      if (document.visibilityState === "visible") {
        startPolling(interval);
      } else {
        stopPolling();
      }
    }
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      stopPolling();
    };
  }, [startPolling, stopPolling, interval]);
}
