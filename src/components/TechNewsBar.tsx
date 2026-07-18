import { useEffect, useState } from 'react';
import { Rss, Zap } from 'lucide-react';

type NewsItem = { title: string; url: string; source?: string };

const FALLBACK: NewsItem[] = [
  { title: 'Loading live tech headlines…', url: '#' },
];

// Curated tech-news RSS feeds (fetched via free rss2json proxy — no key required)
const FEEDS: { url: string; source: string }[] = [
  { url: 'https://techcrunch.com/feed/', source: 'TechCrunch' },
  { url: 'https://www.theverge.com/rss/index.xml', source: 'The Verge' },
  { url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', source: 'Ars Technica' },
  { url: 'https://www.wired.com/feed/category/business/latest/rss', source: 'Wired' },
  { url: 'https://hnrss.org/frontpage', source: 'Hacker News' },
];

const CACHE_KEY = 'tech_news_cache_v1';
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 min

async function fetchFeed(feed: { url: string; source: string }): Promise<NewsItem[]> {
  try {
    const res = await fetch(
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`,
      { cache: 'no-store' }
    );
    const json = await res.json();
    const items = json?.items || [];
    return items.slice(0, 5).map((it: any) => ({
      title: it.title as string,
      url: it.link as string,
      source: feed.source,
    }));
  } catch {
    return [];
  }
}

export function TechNewsBar() {
  const [items, setItems] = useState<NewsItem[]>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.items?.length && Date.now() - parsed.ts < CACHE_TTL_MS) {
          return parsed.items as NewsItem[];
        }
      }
    } catch {}
    return FALLBACK;
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const results = await Promise.all(FEEDS.map(fetchFeed));
      const merged = results.flat().filter((i) => i.title && i.url);
      // Shuffle so sources interleave
      for (let i = merged.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [merged[i], merged[j]] = [merged[j], merged[i]];
      }
      const trimmed = merged.slice(0, 25);
      if (!cancelled && trimmed.length) {
        setItems(trimmed);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items: trimmed }));
        } catch {}
      } else if (!cancelled && !merged.length) {
        setItems([{ title: 'Tech news feed temporarily unavailable', url: '#' }]);
      }
    };

    // Only refetch if cache is stale
    let stale = true;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        stale = !parsed?.ts || Date.now() - parsed.ts >= CACHE_TTL_MS;
      }
    } catch {}
    if (stale) load();

    const id = setInterval(load, CACHE_TTL_MS);
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
                {item.source && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neon-cyan/80 px-1.5 py-0.5 rounded border border-neon-cyan/30">
                    {item.source}
                  </span>
                )}
                <span>{item.title}</span>
                <span className="text-neon-cyan/40">•</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
