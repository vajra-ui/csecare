import { useEffect, useState } from 'react';
import { Rss, Zap } from 'lucide-react';

type NewsItem = { title: string; url: string; points?: number };

const FALLBACK: NewsItem[] = [
  { title: 'Loading live tech headlines…', url: '#' },
];

export function TechNewsBar() {
  const [items, setItems] = useState<NewsItem[]>(FALLBACK);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        // Hacker News Algolia — free, no key, real-time front-page tech stories.
        const res = await fetch(
          'https://hn.algolia.com/api/v1/search?tags=front_page',
          { cache: 'no-store' }
        );
        const json = await res.json();
        const hits: NewsItem[] = (json?.hits || [])
          .filter((h: any) => h.title && (h.url || h.story_url))
          .slice(0, 15)
          .map((h: any) => ({
            title: h.title,
            url: h.url || h.story_url,
            points: h.points,
          }));
        if (!cancelled && hits.length) setItems(hits);
      } catch {
        if (!cancelled)
          setItems([{ title: 'Tech news feed temporarily unavailable', url: '#' }]);
      }
    };

    load();
    const id = setInterval(load, 5 * 60 * 1000); // refresh every 5 min
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Duplicate for seamless marquee loop
  const loop = [...items, ...items];

  return (
    <div className="relative z-20 border-y border-neon-cyan/30 bg-card/70 backdrop-blur-md overflow-hidden">
      <div className="flex items-stretch">
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neon-cyan/20 to-transparent border-r border-neon-cyan/30 shrink-0">
          <Zap className="h-4 w-4 text-neon-cyan animate-pulse" />
          <span className="font-display text-xs font-bold tracking-[0.25em] uppercase text-neon-cyan whitespace-nowrap">
            Live Tech
          </span>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <div className="flex gap-10 py-2 animate-marquee whitespace-nowrap will-change-transform">
            {loop.map((item, i) => (
              <a
                key={`${item.url}-${i}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-body text-foreground/85 hover:text-neon-cyan transition-colors"
              >
                <Rss className="h-3.5 w-3.5 text-neon-purple shrink-0" />
                <span>{item.title}</span>
                {typeof item.points === 'number' && (
                  <span className="text-xs text-muted-foreground">▲ {item.points}</span>
                )}
                <span className="text-neon-cyan/40">•</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
