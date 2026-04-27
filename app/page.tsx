import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getStats() {
  const [installations, repos, runs, jobs, steps] = await Promise.all([
    db.installation.count(),
    db.repo.count(),
    db.workflowRun.count(),
    db.workflowJob.count(),
    db.workflowStep.count()
  ]);
  return { installations, repos, runs, jobs, steps };
}

export default async function Page() {
  let stats: Awaited<ReturnType<typeof getStats>> | null = null;
  let dbError: string | null = null;
  try {
    stats = await getStats();
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  return (
    <main
      style={{
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        maxWidth: 720,
        margin: "60px auto",
        padding: "0 24px",
        color: "#111",
        lineHeight: 1.55
      }}
    >
      <h1 style={{ margin: 0, fontSize: 28 }}>CIForge — MVP-1</h1>
      <p style={{ marginTop: 8, color: "#555" }}>
        Week 1 milestone: GitHub webhook ingest into Postgres.
      </p>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 16 }}>Database state</h2>
        {dbError ? (
          <pre
            style={{
              background: "#fff5f5",
              border: "1px solid #f5c2c2",
              padding: 12,
              borderRadius: 6,
              whiteSpace: "pre-wrap"
            }}
          >
            DB error: {dbError}
          </pre>
        ) : stats ? (
          <table
            style={{
              borderCollapse: "collapse",
              fontSize: 14,
              marginTop: 8
            }}
          >
            <tbody>
              {Object.entries(stats).map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: "4px 16px 4px 0", color: "#555" }}>{k}</td>
                  <td style={{ padding: "4px 0", fontWeight: 600 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 16 }}>Endpoints</h2>
        <ul style={{ paddingLeft: 18 }}>
          <li>
            <code>GET /api/webhooks/github</code> — health check
          </li>
          <li>
            <code>POST /api/webhooks/github</code> — GitHub webhook receiver (HMAC verified)
          </li>
        </ul>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 16 }}>Next</h2>
        <p style={{ color: "#555" }}>
          Week 2 (per <code>SPEC-MVP1.md</code>): regression engine, hypothesis rules, PR comment.
        </p>
      </section>
    </main>
  );
}
