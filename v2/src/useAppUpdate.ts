import { useEffect, useState } from "react";
export function useAppUpdate() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    let disposed = false;
    const workers: ServiceWorker[] = [];
    const onState = (worker: ServiceWorker) => {
      if (
        worker.state === "installed" &&
        navigator.serviceWorker.controller &&
        !disposed
      )
        setWaiting(worker);
    };
    let registration: ServiceWorkerRegistration | undefined;
    const found = () => {
      const worker = registration?.installing;
      if (worker) {
        workers.push(worker);
        worker.addEventListener("statechange", () => onState(worker));
      }
    };
    navigator.serviceWorker
      .register(new URL("sw.js", document.baseURI), { updateViaCache: "none" })
      .then((reg) => {
        registration = reg;
        if (disposed) return;
        if (reg.waiting) setWaiting(reg.waiting);
        reg.addEventListener("updatefound", found);
        found();
      })
      .catch(() => {
        /* Online study remains available if offline installation is unavailable. */
      });
    return () => {
      disposed = true;
      registration?.removeEventListener("updatefound", found);
    };
  }, []);
  function activate() {
    if (!waiting) return;
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => location.reload(),
      { once: true },
    );
    waiting.postMessage({ type: "SKIP_WAITING" });
  }
  return { waiting: !!waiting, activate };
}
