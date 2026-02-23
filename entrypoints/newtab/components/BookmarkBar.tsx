import type { Bookmark } from '../../../src/types';

interface BookmarkBarProps {
  bookmarks: Bookmark[];
}

function BookmarkIcon({ icon }: { icon: string }) {
  if (icon.startsWith('http')) {
    return <img src={icon} alt="" className="h-7 w-7 rounded" />;
  }
  return <span className="text-xl leading-none">{icon}</span>;
}

export function BookmarkBar({ bookmarks }: BookmarkBarProps) {
  return (
    <div className="fixed bottom-16 left-4 z-30 flex flex-col items-center gap-3">
      {bookmarks.map((bm) => (
        <a
          key={bm.id}
          href={bm.url}
          title={bm.label}
          className="flex h-9 w-9 items-center justify-center rounded-lg opacity-40 transition-all hover:scale-110 hover:opacity-100"
        >
          <BookmarkIcon icon={bm.icon} />
        </a>
      ))}
    </div>
  );
}
