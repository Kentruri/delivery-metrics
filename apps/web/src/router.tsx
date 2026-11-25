import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";
import { OverviewPage } from "./routes/OverviewPage";

const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-dvh bg-ground text-body">
      <Outlet />
    </div>
  ),
});

const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: OverviewPage,
});

export const router = createRouter({ routeTree: rootRoute.addChildren([overviewRoute]) });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
