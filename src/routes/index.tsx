import { createFileRoute } from "@tanstack/react-router";
import { ClaimsReview } from "@/components/review/ClaimsReview";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Claims Review · Trust Issues" },
      { name: "description", content: "Review and approve the claims and checks a coding agent must prove before its PR is done." },
      { property: "og:title", content: "Claims Review · Trust Issues" },
      { property: "og:description", content: "Verification-first PRs: approve plain-language claims and their evidence up front." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <ClaimsReview />
      <Toaster />
    </>
  );
}
