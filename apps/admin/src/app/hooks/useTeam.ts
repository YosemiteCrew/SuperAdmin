"use client";
import { useEffect } from "react";
import { useTeamStore } from "@/app/stores/teamStore";

export function useTeam() {
  const store = useTeamStore();

  useEffect(() => {
    store.fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return store;
}
