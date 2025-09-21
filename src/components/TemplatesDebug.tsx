import { useEffect, useState } from "react";
import { apiFetch, type Template } from "../lib/api";
import { layout, text, glass } from "../styles/designSystem";

type Status = "idle" | "loading" | "ready" | "error";

export default function TemplatesDebug() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setStatus("loading");

    apiFetch<Template[]>("/templates")
      .then((data) => {
        if (!isMounted) {
          return;
        }
        setTemplates(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (!isMounted) {
          return;
        }
        setError(err instanceof Error ? err.message : "Unknown error");
        setStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className={`${layout.page} flex items-center justify-center`}>
      <section className="w-full">
        <div className={`${layout.container} py-24`}>
          <div className="mx-auto max-w-3xl">
            <h1 className={`${text.sectionHeading} mb-6`}>Templates (debug)</h1>
            <div className={`${glass.surface} p-6 space-y-4`}>
              {status === "loading" && <p className="text-d-white/70">Loading templates…</p>}
              {status === "error" && (
                <p className="text-d-orange">Failed to load templates: {error}</p>
              )}
              {status === "ready" && templates.length === 0 && (
                <p className="text-d-white/70">No templates yet. Create one via the backend.</p>
              )}
              {status === "ready" && templates.length > 0 && (
                <ul className="space-y-3">
                  {templates.map((template) => (
                    <li key={template.id} className={`${glass.tight} p-4`}>
                      <p className="text-lg font-semibold text-d-white">{template.name}</p>
                      <p className="text-sm text-d-white/60">Modality: {template.modality}</p>
                      {template.category && (
                        <p className="text-sm text-d-white/60">Category: {template.category}</p>
                      )}
                      {template.description && (
                        <p className="text-sm text-d-white/70 mt-1">{template.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
