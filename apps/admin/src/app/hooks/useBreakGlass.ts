"use client";
import { useEffect } from "react";
import { useBreakGlassStore } from "@/app/stores/breakGlassStore";

export function useBreakGlass() {
  const store = useBreakGlassStore();

  useEffect(() => {
    store.fetchGrants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return store;
}
