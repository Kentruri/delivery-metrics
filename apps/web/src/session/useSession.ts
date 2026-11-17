import { loginEndpoint, logoutEndpoint, sessionEndpoint } from "@cloudnonic/delivery-contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { request } from "../api";

export const SESSION_KEY = ["session"] as const;

export const useSession = () => {
  const client = useQueryClient();
  const session = useQuery({
    queryKey: SESSION_KEY,
    queryFn: () => request(sessionEndpoint),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  const signIn = useMutation({
    mutationFn: (password: string) => request(loginEndpoint, { body: { password } }),
    onSuccess: () => client.setQueryData(SESSION_KEY, { authenticated: true }),
  });

  const signOut = useMutation({
    mutationFn: () => request(logoutEndpoint),
    onSettled: () => {
      client.setQueryData(SESSION_KEY, { authenticated: false });
      client.removeQueries({ queryKey: ["history"] });
    },
  });

  // A cookie that expired mid-session sends the reader back to sign in.
  const expire = useCallback(
    () => client.setQueryData(SESSION_KEY, { authenticated: false }),
    [client],
  );

  return { session, signIn, signOut, expire };
};
