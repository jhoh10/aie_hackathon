import { createFileRoute } from "@tanstack/react-router";
import { ReviewWorkspace } from "@/components/review/ReviewWorkspace";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Claims Review · Trust Issues" },
    { name: "description", content: "Review the exact claims and evidence for AI coding changes, approve the plan and hand locked claims to the verifier." },
    { property: "og:title", content: "Claims Review · Trust Issues" },
    { property: "og:description", content: "A verification-first approval workspace for bug fixes, features, refactors and formal guarantees." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ReviewWorkspace,
});
