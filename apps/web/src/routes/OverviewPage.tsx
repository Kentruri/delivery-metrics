import { type Environment, environmentSchema } from "@cloudnonic/delivery-contracts";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../api";
import { BoardBody } from "../board/BoardBody";
import { BoardHeader } from "../board/BoardHeader";
import { BoardError, BoardSkeleton, SourcesNotice, Unreachable } from "../board/BoardStates";
import { disconnectedHosts, lastSyncedAt } from "../board/fromApi";
import { ALL_REPOS } from "../board/model";
import { useBoard } from "../board/useBoard";
import { SignIn } from "../session/SignIn";
import { useSession } from "../session/useSession";

const ENVIRONMENTS = environmentSchema.options;

export const OverviewPage = () => {
  const { session, signIn, signOut, expire } = useSession();
  const [environment, setEnvironment] = useState<Environment>("production");
  const [repo, setRepo] = useState<string>(ALL_REPOS);
  const authenticated = session.data?.authenticated === true;
  const board = useBoard(environment, authenticated);
  const now = useMemo(() => new Date(board.dataUpdatedAt || Date.now()), [board.dataUpdatedAt]);

  useEffect(() => {
    if (board.error instanceof ApiError && board.error.status === 401) {
      expire();
    }
  }, [board.error, expire]);

  if (session.isPending) {
    return <main aria-busy className="min-h-dvh" />;
  }
  if (session.isError) {
    return <Unreachable onRetry={() => session.refetch()} />;
  }
  if (!authenticated) {
    return (
      <SignIn
        onSubmit={(password) => signIn.mutate(password)}
        pending={signIn.isPending}
        error={signIn.error?.message ?? null}
      />
    );
  }

  const { data } = board;
  const body = () => {
    if (data) {
      return (
        <div
          className={`transition-opacity duration-150 ease-out ${board.isPlaceholderData ? "opacity-60" : ""}`}
        >
          <BoardBody data={data} environment={data.environment} repo={repo} now={now} />
        </div>
      );
    }
    if (board.isError) {
      return <BoardError message={board.error.message} onRetry={() => board.refetch()} />;
    }
    return <BoardSkeleton />;
  };

  return (
    <>
      <BoardHeader
        environments={ENVIRONMENTS}
        environment={environment}
        onEnvironmentChange={setEnvironment}
        repos={data ? data.repos.map((entry) => entry.name) : []}
        repo={repo}
        onRepoChange={setRepo}
        syncedAt={data ? lastSyncedAt(data.sources) : null}
        now={now}
        onSignOut={() => signOut.mutate()}
      />
      <SourcesNotice hosts={data ? disconnectedHosts(data) : []} />
      <main className="mx-auto max-w-[1240px] px-4 pt-8 pb-16 sm:px-6 lg:pt-12">{body()}</main>
    </>
  );
};
