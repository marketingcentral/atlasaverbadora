import "@atlas/ui/tokens.css";
import "./global.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@atlas/ui/web";
import { router } from "./router";
import { ImpersonateBar, ImpersonateOffset } from "./components/ImpersonateBar";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultMode="dark">
      <QueryClientProvider client={queryClient}>
        <ImpersonateBar />
        <ImpersonateOffset>
          <RouterProvider router={router} />
        </ImpersonateOffset>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
