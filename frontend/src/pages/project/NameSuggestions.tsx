import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Play, Plus, Square, Users } from "lucide-react";
import { useState } from "react";
import { useFeedback } from "../../components/feedback";
import { Button, Card, IconButton } from "../../components/ui";
import { api } from "../../lib/api";
import { usePreviewPlayer } from "../../lib/hooks";
import type { NameSuggestion, ProjectDetail } from "../../lib/types";

/** Proper nouns found in the book that have no pronunciation rule yet. */
export function NameSuggestions({ project }: { project: ProjectDetail }) {
  const feedback = useFeedback();
  const queryClient = useQueryClient();
  const preview = usePreviewPlayer();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [showAll, setShowAll] = useState(false);
  const names = useQuery({
    queryKey: ["lexicon", "names", project.id],
    queryFn: () => api.nameSuggestions(project.id),
    staleTime: 60_000,
  });

  const add = async (name: NameSuggestion) => {
    const replacement = (drafts[name.word] ?? "").trim();
    if (!replacement) return;
    try {
      await api.createRule({ pattern: name.word, replacement, whole_word: true, case_sensitive: false, project_id: project.id });
      setDrafts(({ [name.word]: _, ...rest }) => rest);
      void queryClient.invalidateQueries({ queryKey: ["lexicon"] });
      void queryClient.invalidateQueries({ queryKey: ["lexicon", "names", project.id] });
      void queryClient.invalidateQueries({ queryKey: ["project", project.id] });
    } catch (error) {
      feedback.error(error);
    }
  };

  const list = names.data ?? [];
  const visible = showAll ? list : list.slice(0, 15);

  return (
    <Card className="mt-6 p-4">
      <div className="mb-1 flex items-center gap-2">
        <Users className="size-4 text-zinc-400" />
        <h3 className="font-semibold">Names in this book</h3>
      </div>
      <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
        Names and invented words are the most common mispronunciations. Listen to each one and add a phonetic spelling where
        needed.
      </p>
      {names.isLoading ? (
        <Loader2 className="size-5 animate-spin text-zinc-400" />
      ) : list.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No names without a rule found.</p>
      ) : (
        <>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {visible.map((name) => {
              const draft = drafts[name.word] ?? "";
              const key = `name-${name.word}`;
              return (
                <form
                  key={name.word}
                  className="flex flex-wrap items-center gap-2 py-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void add(name);
                  }}
                >
                  <IconButton
                    type="button"
                    label={`Listen to “${draft || name.word}”`}
                    onClick={() => preview.play(key, () => api.previewProject(project.id, draft || name.word)).catch(feedback.error)}
                  >
                    {preview.loading === key ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : preview.playing === key ? (
                      <Square className="size-3.5" fill="currentColor" />
                    ) : (
                      <Play className="size-4" />
                    )}
                  </IconButton>
                  <div className="min-w-0 flex-1" title={name.example}>
                    <div className="text-sm font-medium">
                      {name.word} <span className="text-xs font-normal text-zinc-500">{name.count}×</span>
                    </div>
                    <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{name.example}</div>
                  </div>
                  <input
                    className="input h-8 w-40 text-sm"
                    placeholder="Say instead"
                    value={draft}
                    onChange={(e) => setDrafts({ ...drafts, [name.word]: e.target.value })}
                  />
                  <IconButton type="submit" label="Add rule" disabled={!draft.trim()}>
                    <Plus className="size-4" />
                  </IconButton>
                </form>
              );
            })}
          </div>
          {list.length > visible.length && (
            <Button size="sm" className="mt-2" onClick={() => setShowAll(true)}>
              Show all {list.length}
            </Button>
          )}
        </>
      )}
    </Card>
  );
}
