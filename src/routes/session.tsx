import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { Session } from "@/components/session/Session";

export const Route = createFileRoute("/session")({
  head: () => ({
    meta: [
      { title: "Run a session · Trust Issues" },
      { name: "description", content: "Walk a PocketBase fix through brief, claims, approval and a live verifier run with a PASS or BLOCK verdict." },
      { property: "og:title", content: "Run a verification-first session" },
      { property: "og:description", content: "Edit claims, approve the plan, then watch the verifier prove or block the agent's change." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <>
      <SiteNav />
      <Session />
    </>
  ),
});
