import type { Bookmark } from '../../../src/types';

interface BookmarkBarProps {
  bookmarks: Bookmark[];
}

function BookmarkIcon({ icon }: { icon: string }) {
  if (icon.startsWith('http')) {
    return <img src={icon} alt="" className="h-5 w-5 rounded" />;
  }
  return <span className="text-lg leading-none">{icon}</span>;
}

export function BookmarkBar({ bookmarks }: BookmarkBarProps) {
  return (
    <div className="fixed bottom-[6.25rem] left-4 z-30">
      <div className="flex flex-col items-center gap-1.5 rounded-full bg-surface-hover/70 px-2 py-2 backdrop-blur-sm">
        {bookmarks.map((bm) => (
          <a
            key={bm.id}
            href={bm.url}
            title={bm.label}
            className="flex h-8 w-8 items-center justify-center rounded-full opacity-40 transition-all hover:scale-110 hover:opacity-100"
          >
            <BookmarkIcon icon={bm.icon} />
          </a>
        ))}
      </div>
    </div>
  );
}
