import CrittrAiAssistantMarkdown from "@/components/crittr-ai/CrittrAiAssistantMarkdown";
import { useEffect, useRef, useState } from "react";

type Props = {
  markdown: string;
  /** When true, reveal `markdown` progressively; when false, show it immediately. */
  animate: boolean;
  onTypingComplete?: () => void;
};

/**
 * Renders assistant markdown, optionally revealing it at a steady “typing” speed
 * (smooth rAF-driven character reveal) after a fresh CrittrAI reply.
 */
export default function CrittrAiAssistantTypingReveal({
  markdown,
  animate,
  onTypingComplete,
}: Props) {
  const [displayed, setDisplayed] = useState(() => (animate ? "" : markdown));
  const completeFiredRef = useRef(false);

  useEffect(() => {
    if (!animate) {
      setDisplayed(markdown);
      completeFiredRef.current = false;
      return;
    }

    completeFiredRef.current = false;
    setDisplayed("");

    let cancelled = false;
    let charIndex = 0;
    let lastTs = performance.now();
    /** Characters per second — tuned to feel like typical assistant streaming. */
    const CPS = 110;
    let rafId = 0;

    const step = (now: number) => {
      if (cancelled) return;
      const dt = Math.min(0.064, (now - lastTs) / 1000);
      lastTs = now;
      charIndex = Math.min(markdown.length, charIndex + CPS * dt);
      const nextLen = Math.floor(charIndex);
      setDisplayed(markdown.slice(0, nextLen));

      if (nextLen < markdown.length) {
        rafId = requestAnimationFrame(step);
      } else if (onTypingComplete && !completeFiredRef.current) {
        completeFiredRef.current = true;
        onTypingComplete();
      }
    };

    rafId = requestAnimationFrame(step);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [animate, markdown, onTypingComplete]);

  return <CrittrAiAssistantMarkdown markdown={displayed} />;
}
