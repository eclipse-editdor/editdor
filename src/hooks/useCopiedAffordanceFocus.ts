import { useEffect, useRef, useState } from "react";

interface IUseCopiedAffordanceFocusOptions {
  copiedToken?: number;
  highlightDurationMs?: number;
}

interface IUseCopiedAffordanceFocusResult {
  containerRef: React.RefObject<HTMLDetailsElement>;
  isExpanded: boolean;
  isHighlighted: boolean;
  setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useCopiedAffordanceFocus = ({
  copiedToken,
  highlightDurationMs = 3000,
}: IUseCopiedAffordanceFocusOptions): IUseCopiedAffordanceFocusResult => {
  const containerRef = useRef<HTMLDetailsElement>(null);
  const highlightTimeoutRef = useRef<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);

  useEffect(() => {
    if (copiedToken === undefined) {
      return;
    }

    setIsExpanded(true);
    setIsHighlighted(true);
    containerRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    if (highlightTimeoutRef.current !== null) {
      window.clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = window.setTimeout(() => {
      setIsHighlighted(false);
    }, highlightDurationMs);

    return () => {
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
    };
  }, [copiedToken, highlightDurationMs]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  return {
    containerRef,
    isExpanded,
    isHighlighted,
    setIsExpanded,
  };
};
