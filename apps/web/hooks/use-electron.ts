import { useEffect, useState } from "react";

export function useIsElectron(): boolean {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    const electron = typeof window !== "undefined" && window.electronAPI?.isElectron === true;
    setIsElectron(electron);
  }, []);

  return isElectron;
}
