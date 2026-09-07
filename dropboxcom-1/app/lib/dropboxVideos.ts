/**
 * Guarantees the four decorative product videos actually autoplay.
 *
 * The captured markup carries `autoplay playsinline loop muted`, which looks
 * sufficient but is not: React renders `muted` as an HTML *attribute*, while
 * Chrome's autoplay policy gates on the HTMLMediaElement `muted` *property*.
 * An attribute-only `muted` therefore yields a video that silently never
 * starts (and a rejected play() promise). Setting the property — plus
 * `defaultMuted`, so the state survives a `load()` — restores autoplay.
 *
 * Faithfulness note: no `prefers-reduced-motion` gate here on purpose. These
 * are looping transparent product demos that the live page plays
 * unconditionally, and pausing them would diverge from the original.
 */
import { $all, type Teardown } from './runtime';

export function initDropboxVideos(root: ParentNode = document): Teardown | void {
  const videos = $all<HTMLVideoElement>('video', root);
  if (!videos.length) return;

  const start = (video: HTMLVideoElement) => {
    video.muted = true;
    video.defaultMuted = true;
    const played = video.play();
    // Rejects when the element is not yet decodable; the `canplay` listener
    // below retries, so swallowing is safe and keeps the console clean.
    if (played && typeof played.catch === 'function') played.catch(() => undefined);
  };

  const cleanups: Array<() => void> = [];
  for (const video of videos) {
    start(video);
    const onCanPlay = () => start(video);
    video.addEventListener('canplay', onCanPlay);
    cleanups.push(() => video.removeEventListener('canplay', onCanPlay));
  }

  return () => {
    for (const fn of cleanups) fn();
  };
}
