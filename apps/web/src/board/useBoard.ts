import { type Environment, historyEndpoint } from "@cloudnonic/delivery-contracts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { request } from "../api";
import { toBoard } from "./fromApi";

export const useBoard = (environment: Environment, enabled: boolean) =>
  useQuery({
    queryKey: ["history", environment],
    // Carries its own environment, so a dimmed placeholder keeps its own labels.
    queryFn: async () => ({
      ...toBoard(await request(historyEndpoint, { query: { environment } })),
      environment,
    }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    retry: (count, error) => count < 2 && !("status" in error && error.status === 401),
  });
