"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlert } from "lucide-react";

function isOfficialHost(hostname: string): boolean {
  if (hostname === "127.0.0.1" || hostname === "[::1]") return true;
  const baseDomains = [
    "localhost",
    "caplayground.vercel.app",
    "caplayground.enkei64.xyz",
    "caplayground.netlify.app",
    "caplayground.squair.xyz",
    "caplayground.kittycat.boo",
    "caplayground.cowabun.ga"
  ];
  return baseDomains.some((base) => hostname === base || hostname.endsWith(`.${base}`));
}

export function UnofficialDomainBanner() {
  const [show, setShow] = useState(false);
  const key = useMemo(() => {
    if (typeof window === "undefined") return "caplay_unofficial_dismissed:";
    return `caplay_unofficial_dismissed:${window.location.hostname}`;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname || "";
    const dismissed = typeof localStorage !== "undefined" ? localStorage.getItem(key) === "1" : false;
    const shouldShow = !isOfficialHost(host) && !dismissed;
    setShow(shouldShow);

    if (shouldShow) {
      document.documentElement.style.setProperty("--unofficial-banner-height", "48px");
    } else {
      document.documentElement.style.setProperty("--unofficial-banner-height", "0px");
    }
  }, [key, show]);

  if (!show) return null;

  return (
    <div className="sticky top-0 z-50">
      <Alert variant="destructive" className="rounded-none border-0 h-12 flex items-center">
        <TriangleAlert />
        <AlertTitle className="mb-0 mr-2">Unofficial domain</AlertTitle>
        <AlertDescription className="mt-0">
          You are visiting this site on an unofficial domain. For the official site, please use
          {" "}
          <a className="underline font-medium" href="https://caplayground.vercel.app" target="_blank" rel="noreferrer">caplayground.vercel.app</a>
        </AlertDescription>
        <button
          type="button"
          className="absolute right-2 top-3 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
          onClick={() => {
            try { localStorage.setItem(key, "1"); } catch { }
            setShow(false);
            document.documentElement.style.setProperty("--unofficial-banner-height", "0px");
          }}
        >
          ✕
        </button>
      </Alert>
    </div>
  );
}

export default UnofficialDomainBanner;
