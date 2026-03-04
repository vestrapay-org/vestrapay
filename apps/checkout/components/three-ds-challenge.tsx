"use client";

import { useEffect, useRef, useCallback } from "react";

interface ThreeDsChallengeProps {
  readonly html: string;
  readonly reference: string;
  readonly onComplete: (reference: string) => void;
}

export function ThreeDsChallenge({
  html,
  reference,
  onComplete,
}: ThreeDsChallengeProps): React.ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (
        event.data === "3ds-complete" ||
        event.data?.type === "3ds-complete" ||
        event.data?.event === "3DSMethodFinished" ||
        event.data?.event === "AuthenticationComplete"
      ) {
        onComplete(reference);
      }
    },
    [onComplete, reference],
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = html;

    const scripts = container.querySelectorAll("script");
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }, [html]);

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-2 space-y-4 duration-300">
      <div className="space-y-1.5 text-center">
        <p className="text-lg font-semibold text-[#3c4257]">Verify your identity</p>
        <p className="text-sm text-[#6b7c93]">
          Your bank requires additional verification. Please complete the challenge below.
        </p>
      </div>

      <div
        ref={containerRef}
        className="min-h-64 overflow-hidden rounded-lg border border-[#e3e8ee]"
      />

      <button
        type="button"
        onClick={() => onComplete(reference)}
        className="mt-2 h-10 w-full cursor-pointer rounded-lg border border-[#e3e8ee] text-sm font-medium text-[#6b7c93] transition-colors hover:bg-[#f6f9fc] sm:h-11"
      >
        I&apos;ve completed verification
      </button>
    </div>
  );
}
