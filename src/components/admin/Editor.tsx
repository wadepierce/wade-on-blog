import { useCallback, useEffect, useRef, useState } from 'react';
import MDEditor, { commands } from '@uiw/react-md-editor';

type PostDraft = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  contentMd: string;
  published: boolean;
};

type Props = {
  initial: PostDraft;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function Editor({ initial }: Props) {
  const [draft, setDraft] = useState<PostDraft>(initial);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errMsg, setErrMsg] = useState<string>('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const save = useCallback(
    async (patch: Partial<PostDraft>) => {
      setSaveState('saving');
      try {
        const res = await fetch(`/api/posts/${draft.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error(await res.text());
        const updated = await res.json();
        setDraft((d) => ({ ...d, ...updated }));
        setSaveState('saved');
      } catch (err) {
        setSaveState('error');
        setErrMsg(err instanceof Error ? err.message : String(err));
      }
    },
    [draft.id],
  );

  // Autosave debounced
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (
      draft.title === initial.title &&
      draft.contentMd === initial.contentMd &&
      draft.slug === initial.slug &&
      draft.excerpt === initial.excerpt
    ) {
      return;
    }
    saveTimer.current = setTimeout(() => {
      void save({
        title: draft.title,
        contentMd: draft.contentMd,
        slug: draft.slug,
        excerpt: draft.excerpt,
      });
    }, 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.title, draft.contentMd, draft.slug, draft.excerpt]);

  async function publish(next: boolean) {
    await save({
      title: draft.title,
      contentMd: draft.contentMd,
      slug: draft.slug,
      excerpt: draft.excerpt,
      published: next,
    });
  }

  async function deletePost() {
    if (!confirm('Delete this post?')) return;
    await fetch(`/api/posts/${draft.id}`, { method: 'DELETE' });
    window.location.href = '/admin';
  }

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/uploads', { method: 'POST', body: fd });
    if (!res.ok) {
      setErrMsg(await res.text());
      setSaveState('error');
      return;
    }
    const { url } = await res.json();
    setDraft((d) => ({ ...d, contentMd: d.contentMd + `\n\n![](${url})\n` }));
    e.target.value = '';
  }

  const imageCommand: commands.ICommand = {
    name: 'upload-image',
    keyCommand: 'upload-image',
    buttonProps: { 'aria-label': 'Upload image' },
    icon: (
      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
        <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 2h12v7.5l-3-3-4 4-2-2L4 15V5zm3 3a1 1 0 100-2 1 1 0 000 2z" />
      </svg>
    ),
    execute: () => fileInputRef.current?.click(),
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 -mx-4 border-b border-neutral-200 bg-white/90 px-4 py-2 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
        <div className="flex items-center justify-between gap-2">
          <a
            href="/admin"
            className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            ← Back
          </a>
          <div className="flex items-center gap-2 text-xs">
            <span
              className={
                saveState === 'error'
                  ? 'text-red-600 dark:text-red-400'
                  : saveState === 'saving'
                    ? 'text-neutral-500'
                    : saveState === 'saved'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-neutral-400'
              }
            >
              {saveState === 'saving'
                ? 'Saving…'
                : saveState === 'saved'
                  ? 'Saved'
                  : saveState === 'error'
                    ? 'Save failed'
                    : 'Idle'}
            </span>
            {draft.published ? (
              <button
                type="button"
                onClick={() => void publish(false)}
                className="rounded bg-neutral-200 px-3 py-1 text-sm font-medium hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              >
                Unpublish
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void publish(true)}
                className="rounded bg-neutral-900 px-3 py-1 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                Publish
              </button>
            )}
            <button
              type="button"
              onClick={() => void deletePost()}
              className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              aria-label="Delete post"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {errMsg && saveState === 'error' && (
        <p className="text-sm text-red-600 dark:text-red-400">{errMsg}</p>
      )}

      <input
        type="text"
        value={draft.title}
        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        placeholder="Title"
        className="w-full border-0 bg-transparent text-2xl font-bold focus:outline-none focus:ring-0"
      />

      <input
        type="text"
        value={draft.slug}
        onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
        placeholder="slug"
        className="w-full border-b border-neutral-200 bg-transparent py-1 text-sm text-neutral-500 focus:border-neutral-400 focus:outline-none dark:border-neutral-800 dark:focus:border-neutral-600"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onFilePicked}
        className="hidden"
      />

      <div data-color-mode="auto">
        <MDEditor
          value={draft.contentMd}
          onChange={(v) => setDraft((d) => ({ ...d, contentMd: v ?? '' }))}
          height={520}
          preview="edit"
          visibleDragbar={false}
          commands={[
            commands.bold,
            commands.italic,
            commands.strikethrough,
            commands.hr,
            commands.title,
            commands.divider,
            commands.link,
            commands.quote,
            commands.code,
            commands.codeBlock,
            imageCommand,
            commands.unorderedListCommand,
            commands.orderedListCommand,
            commands.checkedListCommand,
          ]}
          extraCommands={[commands.codeEdit, commands.codeLive, commands.codePreview]}
        />
      </div>

      <textarea
        value={draft.excerpt}
        onChange={(e) => setDraft((d) => ({ ...d, excerpt: e.target.value }))}
        placeholder="Excerpt (optional — auto-generated from content if blank)"
        rows={2}
        className="w-full rounded border border-neutral-200 bg-transparent p-2 text-sm dark:border-neutral-800"
      />
    </div>
  );
}
