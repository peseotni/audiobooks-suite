import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkPlus, Check, Pencil, Play, Trash2, X } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import { formatDuration } from "../lib/format";
import type { Book, Bookmark } from "../lib/types";
import { usePlayer } from "../player/PlayerContext";
import { useFeedback } from "./feedback";
import { Button, Card, IconButton } from "./ui";

export function BookmarksCard({ book }: { book: Book }) {
  const player = usePlayer();
  const feedback = useFeedback();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState({ title: "", note: "" });
  const key = ["bookmarks", book.id];
  const { data: bookmarks = [] } = useQuery({ queryKey: key, queryFn: () => api.bookmarks(book.id) });
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: key });

  const save = useMutation({
    mutationFn: (bookmark: Bookmark) => api.updateBookmark(bookmark.id, draft),
    onSuccess: () => {
      setEditing(null);
      invalidate();
    },
    onError: feedback.error,
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.deleteBookmark(id),
    onSuccess: invalidate,
    onError: feedback.error,
  });

  const isCurrent = player.book?.id === book.id;

  return (
    <Card className="mt-6 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold">Bookmarks</h2>
        {isCurrent && (
          <Button size="sm" icon={<BookmarkPlus className="size-4" />} onClick={player.addBookmark}>
            Bookmark {formatDuration(player.position, "clock")}
          </Button>
        )}
      </div>
      {bookmarks.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No bookmarks yet. While listening, press <kbd className="rounded border px-1 text-xs">B</kbd> or use the bookmark
          button in the player to save the current position.
        </p>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {bookmarks.map((bookmark) =>
            editing === bookmark.id ? (
              <div key={bookmark.id} className="space-y-2 py-3">
                <input
                  className="input w-full"
                  value={draft.title}
                  maxLength={300}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  aria-label="Bookmark title"
                />
                <textarea
                  className="input min-h-20 w-full"
                  value={draft.note}
                  maxLength={5000}
                  placeholder="Note"
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                  aria-label="Bookmark note"
                />
                <div className="flex justify-end gap-1">
                  <IconButton label="Cancel" onClick={() => setEditing(null)}>
                    <X className="size-4" />
                  </IconButton>
                  <IconButton label="Save" onClick={() => save.mutate(bookmark)}>
                    <Check className="size-4" />
                  </IconButton>
                </div>
              </div>
            ) : (
              <div key={bookmark.id} className="flex items-start gap-3 py-2.5">
                <IconButton label={`Play from ${formatDuration(bookmark.position, "clock")}`} onClick={() => player.play(book, bookmark.position)}>
                  <Play className="size-4" />
                </IconButton>
                <div className="min-w-0 flex-1 pt-1.5">
                  <div className="flex items-baseline gap-2 text-sm">
                    <span className="text-xs text-zinc-500 tabular-nums">{formatDuration(bookmark.position, "clock")}</span>
                    <span className="truncate font-medium">{bookmark.title}</span>
                  </div>
                  {bookmark.note && (
                    <p className="mt-1 text-sm whitespace-pre-line text-zinc-600 dark:text-zinc-300">{bookmark.note}</p>
                  )}
                </div>
                <IconButton
                  label="Edit bookmark"
                  onClick={() => {
                    setDraft({ title: bookmark.title, note: bookmark.note });
                    setEditing(bookmark.id);
                  }}
                >
                  <Pencil className="size-4" />
                </IconButton>
                <IconButton label="Delete bookmark" onClick={() => remove.mutate(bookmark.id)}>
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
            ),
          )}
        </div>
      )}
    </Card>
  );
}
