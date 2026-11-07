import { createFileRoute } from "@tanstack/react-router";
import { ClaimsReview } from "@/components/review/ClaimsReview";
import { SiteNav } from "@/components/SiteNav";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Claims Review · Trust Issues" },
      { name: "description", content: "Review and approve the claims and checks a coding agent must prove before its PR is done." },
      { property: "og:title", content: "Claims Review · Trust Issues" },
      { property: "og:description", content: "Approve plain-language claims and their evidence up front, or load your own plan.md." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <>
      <SiteNav />
      <ClaimsReview />
    </>
  ),
});
