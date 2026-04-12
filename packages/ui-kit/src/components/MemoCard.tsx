import * as React from "react";
import { cn } from "../lib/utils";
import { Tag } from "./Tag";
import { Button } from "./Button";

export interface MemoAttachmentPreview {
  url: string;
  mimeType?: string;
}

export interface MemoCardProps extends React.HTMLAttributes<HTMLElement> {
  variant?: "desktop" | "mobile";
  header: {
    date: string;
    maidName?: string;
  };
  content: string;
  tags?: string[];
  attachments?: MemoAttachmentPreview[];
  onMoreClick?: () => void;
}

export const MemoCard = React.forwardRef<HTMLElement, MemoCardProps>(
  ({ className, variant = "desktop", header, content, tags = [], attachments = [], onMoreClick, ...props }, ref) => {
    if (variant === "mobile") {
      return (
        <article ref={ref} className={cn("flex gap-5 group", className)} {...props}>
          <div className="w-16 pt-1 flex-shrink-0">
            <span className="text-[10px] font-label text-outline-variant uppercase tracking-widest block text-right">
              {header.date}
            </span>
          </div>
          <div className="flex-1 space-y-3">
            {attachments.length > 0 && (
              <img 
                alt="Attachment" 
                className="w-full aspect-video object-cover rounded-2xl shadow-sm brightness-[0.98] hover:brightness-100 transition-all duration-500" 
                src={attachments[0].url} 
              />
            )}
            <p className="text-[17px] leading-relaxed font-body text-on-surface whitespace-pre-wrap">
              {content}
            </p>
            {tags.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {tags.map((tag, idx) => (
                  <span key={idx} className="px-3 py-1 bg-surface-container text-on-surface-variant text-[10px] rounded-full font-medium tracking-wide">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </article>
      );
    }

    return (
      <article
        ref={ref}
        className={cn(
          "bg-surface-container-low p-8 rounded-2xl transition-all hover:shadow-md hover:bg-surface-container flex flex-col gap-6 group border border-transparent hover:border-outline-variant/10",
          className
        )}
        {...props}
      >
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/40">
            {header.date}
            {header.maidName ? ` · ${header.maidName}` : ""}
          </span>
          <Button 
            variant="icon" 
            className="opacity-0 group-hover:opacity-100 transition-opacity !p-0"
            onClick={onMoreClick}
          >
            <span className="material-symbols-outlined">more_horiz</span>
          </Button>
        </div>

        <div className="space-y-4">
          <p className="text-xl font-body leading-relaxed text-primary whitespace-pre-wrap">
            {content}
          </p>
          
          {attachments.length > 0 && (
            <div className="w-full aspect-[16/9] rounded-xl overflow-hidden grayscale hover:grayscale-0 transition-all duration-700">
              <img 
                alt="Attachment" 
                className="w-full h-full object-cover" 
                src={attachments[0].url} 
              />
            </div>
          )}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, idx) => (
              <Tag key={idx} variant="subtle">
                {tag}
              </Tag>
            ))}
          </div>
        )}
      </article>
    );
  }
);
MemoCard.displayName = "MemoCard";
