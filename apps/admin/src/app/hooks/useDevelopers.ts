"use client";
import { useEffect } from "react";
import { useDeveloperStore } from "@/app/stores/developerStore";

export function useDevelopers() {
  const store = useDeveloperStore();

  useEffect(() => {
    store.fetchDevelopers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return store;
}
