import { useMutation } from "@tanstack/react-query";
import { Replace, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useFeedback } from "../../components/feedback";
import { Button, Field, Modal } from "../../components/ui";
import { api } from "../../lib/api";
import type { FindReplaceRequest, FindReplaceResult, ProjectDetail } from "../../lib/types";

const OPTIONS = [
  ["whole_word", "Whole words only"],
  ["case_sensitive", "Case sensitive"],
  ["is_regex", "Regular expression"],
  ["include_titles", "Also chapter titles"],
] as const;

export function FindReplaceModal({
  project,
  open,
  chapterIds,
  onClose,
  onApplied,
}: {
  project: ProjectDetail;
  open: boolean;
  /** Limit the search to these chapters (all chapters when empty). */
  chapterIds: number[];
  onClose: () => void;
  onApplied: () => void;
}) {
  const feedback = useFeedback();
  const [form, setForm] = useState({
    find: "",
    replace: "",
    is_regex: false,
    case_sensitive: false,
    whole_word: false,
    include_titles: false,
  });
  const [result, setResult] = useState<FindReplaceResult | null>(null);

  // Any change to the search invalidates the preview.
  useEffect(() => setResult(null), [form, chapterIds.length]);

  const body = (dryRun: boolean): FindReplaceRequest => ({
    ...form,
    chapter_ids: chapterIds.length ? chapterIds : null,
    dry_run: dryRun,
  });

  const search = useMutation({
    mutationFn: () => api.findReplace(project.id, body(true)),
    onSuccess: setResult,
    onError: feedback.error,
  });
  const apply = useMutation({
    mutationFn: () => api.findReplace(project.id, body(false)),
    onSuccess: (applied) => {
      feedback.success(`Replaced ${applied.total} occurrence${applied.total === 1 ? "" : "s"} in ${applied.chapters.length} chapter${applied.chapters.length === 1 ? "" : "s"}`);
      setResult(null);
      onApplied();
    },
    onError: feedback.error,
  });

  const locked = project.status === "rendering" || project.status === "importing";

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Find & replace"
      description={
        chapterIds.length
          ? `Searching ${chapterIds.length} selected chapter${chapterIds.length === 1 ? "" : "s"}.`
          : "Fix OCR errors, typos or spelling across the whole book. The source document is not changed."
      }
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <Button
            icon={<Search className="size-4" />}
            loading={search.isPending}
            disabled={!form.find}
            onClick={() => search.mutate()}
          >
            Find
          </Button>
          <Button
            variant="primary"
            icon={<Replace className="size-4" />}
            loading={apply.isPending}
            disabled={!result?.total || locked}
            onClick={() => apply.mutate()}
          >
            Replace all{result?.total ? ` (${result.total})` : ""}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (form.find) search.mutate();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Find">
            <input className="input" value={form.find} autoFocus onChange={(e) => setForm({ ...form, find: e.target.value })} />
          </Field>
          <Field label="Replace with">
            <input
              className="input"
              value={form.replace}
              placeholder={form.is_regex ? "\\1 refers to the first group" : ""}
              onChange={(e) => setForm({ ...form, replace: e.target.value })}
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-zinc-600 dark:text-zinc-300">
          {OPTIONS.map(([field, label]) => (
            <label key={field} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                className="size-3.5 accent-brand-600"
                checked={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
        <button type="submit" className="hidden" />
      </form>

      {result && (
        <div className="mt-5">
          {result.total === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No matches.</p>
          ) : (
            <>
              <p className="mb-3 text-sm font-medium">
                {result.total} match{result.total === 1 ? "" : "es"} in {result.chapters.length} chapter
                {result.chapters.length === 1 ? "" : "s"}
              </p>
              <div className="space-y-3">
                {result.chapters.map((chapter) => (
                  <div key={chapter.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                    <div className="mb-1.5 flex justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{chapter.title}</span>
                      <span className="shrink-0 text-xs text-zinc-500">{chapter.count}×</span>
                    </div>
                    <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                      {chapter.examples.map((example, i) => (
                        <li key={i} className="break-words">
                          {example.before}
                          <del className="rounded bg-red-100 px-0.5 text-red-800 dark:bg-red-500/20 dark:text-red-300">{example.match}</del>
                          {example.replacement !== null && (
                            <ins className="rounded bg-emerald-100 px-0.5 text-emerald-800 no-underline dark:bg-emerald-500/20 dark:text-emerald-300">
                              {example.replacement}
                            </ins>
                          )}
                          {example.after}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
