import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { cn } from "./lib/utils";
import React from "react";

interface InfiniteScrollProps<T> {
  scrollRef: React.RefObject<HTMLDivElement>;
  children: React.ReactNode;
  loadMoreTop: () => void;
  loadMoreBottom: () => void;
  messages: T[];
  isLoading: boolean;
  isTopFetchMore: boolean;
  isBottomFetchMore: boolean;
  direction: "up" | "middle" | "down";
  cursor: string | null;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  searchQuery: string;
  searchedMessageIds: string[];
  searchedMessageColor?: string;
  loader: React.ReactNode;
  scrollLoader: React.ReactNode;
  className?: string;
  threshold?: number;
  rootMargin?: string;
}

export const InfiniteScroll = <T,>({
  scrollRef,
  children,
  loadMoreTop,
  loadMoreBottom,
  messages,
  isLoading,
  isTopFetchMore,
  isBottomFetchMore,
  direction,
  cursor,
  setIsLoading,
  searchQuery,
  searchedMessageIds,
  searchedMessageColor = "bg-border-surface-accent-red-orange",
  loader,
  scrollLoader,
  className,
  threshold = 0.5,
  rootMargin = "100px",
}: InfiniteScrollProps<T>) => {
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);

  useEffect(() => {
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !isLoading && scrollRef.current) {
          if (entry.target.id === "top-sentinel" && isTopFetchMore) {
            loadMoreTop();
          } else if (
            entry.target.id === "bottom-sentinel" &&
            isBottomFetchMore
          ) {
            loadMoreBottom();
          }
        }
      });
    };

    const observerOptions = {
      root: scrollRef.current,
      threshold,
      rootMargin,
    };

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions
    );

    if (topSentinelRef.current) observer.observe(topSentinelRef.current);
    if (bottomSentinelRef.current) observer.observe(bottomSentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [
    messages,
    isLoading,
    loadMoreTop,
    loadMoreBottom,
    isTopFetchMore,
    isBottomFetchMore,
    scrollRef,
    threshold,
    rootMargin,
  ]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (scrollRef.current) {
        const newScrollHeight = scrollRef.current.scrollHeight;
        const scrollHeightDiff = newScrollHeight - prevScrollHeightRef.current;
        if (direction === "up") {
          scrollRef.current.scrollTop += scrollHeightDiff;
        } else if (direction === "down") {
          scrollRef.current.scrollTop = -scrollHeightDiff;
        } else {
          const targetMessage = scrollRef.current.querySelector(
            `[data-message-id="${cursor}"]`
          );

          if (targetMessage) {
            targetMessage.scrollIntoView({
              behavior: "auto",
              block: "center",
            });
            setTimeout(() => {
              setIsLoading(false);
            }, 1000);
          }
        }
        prevScrollHeightRef.current = newScrollHeight;
      }
    });

    if (scrollRef.current) {
      resizeObserver.observe(scrollRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [messages, cursor, setIsLoading, direction, scrollRef]);

  // 검색된 메세지 강조
  useEffect(() => {
    if (!searchQuery || !scrollRef.current || !searchedMessageIds.length)
      return;

    const scrollElement = scrollRef.current;

    searchedMessageIds.forEach((messageId) => {
      const messageElement = scrollElement.querySelector(
        `[data-message-id="${messageId}"]`
      );

      if (messageElement && messageElement?.textContent) {
        const originalText = messageElement.textContent;

        if (originalText.toLowerCase().includes(searchQuery.toLowerCase())) {
          const parts = originalText.split(
            new RegExp(`(${searchQuery})`, "gi")
          );
          const highlightedContent = parts
            .map((part) =>
              part.toLowerCase() === searchQuery.toLowerCase()
                ? `<span class="${searchedMessageColor} text-text-white">${part}</span>`
                : part
            )
            .join("");

          messageElement.innerHTML = highlightedContent;
        }
      }
    });

    return () => {
      searchedMessageIds.forEach((messageId) => {
        const messageElement = scrollElement?.querySelector(
          `[data-message-id="${messageId}"]`
        );
        if (messageElement && messageElement.textContent) {
          messageElement.innerHTML = messageElement.textContent;
        }
      });
    };
  }, [
    messages,
    searchQuery,
    searchedMessageIds,
    searchedMessageColor,
    scrollRef,
  ]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        className,
        "bg-background-alternative h-full w-full min-w-[320px] px-4 py-0 overflow-y-auto flex flex-col-reverse"
      )}
    >
      {isLoading && loader}

      <div className="flex flex-col gap-x-2 w-full py-3 relative">
        {isTopFetchMore && (
          <div ref={topSentinelRef} id="top-sentinel" className="">
            {scrollLoader}
          </div>
        )}
        {children}
        {isBottomFetchMore && (
          <div ref={bottomSentinelRef} id="bottom-sentinel" className="">
            {scrollLoader}
          </div>
        )}
      </div>
    </div>
  );
};
