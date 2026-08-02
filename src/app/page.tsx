import { loadCaseStudy } from "@/data/load-case-study";
import { AwardPlanner } from "@/features/award-planner/award-planner";

export default function HomePage() {
  const result = loadCaseStudy();

  if (!result.success) {
    const issueMessages =
      result.stage === "schema"
        ? result.issues.map(
          (issue) =>
            `${issue.path.join(".") || "dataset"}: ${issue.message}`,
        )
        : result.issues.map((issue) => {
          const context = Object.entries(issue)
            .filter(([key]) => key !== "code")
            .map(([key, value]) => `${key}=${value}`)
            .join(", ");

          return `${issue.code}: ${context}`;
        });

    return (
      <main className="mx-auto min-h-screen max-w-4xl px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-700">
          Invalid dataset
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          The RFQ data could not be loaded
        </h1>
        <ul className="mt-6 list-disc space-y-2 pl-5 text-slate-700">
          {issueMessages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </main>
    );
  }

  // Keep loading and validation on the server; only validated, serializable
  // case-study data crosses the Server-to-Client Component boundary.
  return (
    <AwardPlanner caseStudy={result.data} />
  );
}
