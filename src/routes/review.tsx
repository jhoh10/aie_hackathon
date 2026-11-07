import { createFileRoute } from "@tanstack/react-router";
import { ReviewerWorkspace } from "@/components/review/ReviewerWorkspace";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Reviewer Harness · Trust Issues" },
      { name: "description", content: "Review finished pull requests through their behavior changes, test coverage and architecture, then export your decision." },
      { property: "og:title", content: "Reviewer Harness · Trust Issues" },
      { property: "og:description", content: "Inspect the real pylint review packet, flag untested behavior and hand feedback back as claim edits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReviewerWorkspace,
});
