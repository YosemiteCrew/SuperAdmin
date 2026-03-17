"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import YosemiteLoader from "@/app/ui/overlays/Loader/YosemiteLoader";
import {
  startRouteLoader,
  stopRouteLoader,
  useRouteLoaderStore,
} from "@/app/stores/routeLoaderStore";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export default function RouteLoaderOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const isLoading = useRouteLoaderStore((s) => s.isLoading);
  const initializedRef = useRef(false);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.dataset.noRouteLoader === "true") return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const rawHref = anchor.getAttribute("href") ?? "";
      if (rawHref.startsWith("#")) return;

      let nextUrl: URL;
      try {
        nextUrl = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (!ALLOWED_PROTOCOLS.has(nextUrl.protocol)) return;
      if (nextUrl.origin !== window.location.origin) return;

      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const next = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      if (current === next) return;

      startRouteLoader();
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    stopRouteLoader();
  }, [pathname, searchKey]);

  useEffect(() => {
    if (!isLoading) return;
    const timeout = window.setTimeout(() => {
      stopRouteLoader();
    }, 15000);
    return () => window.clearTimeout(timeout);
  }, [isLoading]);

  if (!isLoading) return null;

  return <YosemiteLoader variant="fullscreen-translucent" size={150} />;
}
