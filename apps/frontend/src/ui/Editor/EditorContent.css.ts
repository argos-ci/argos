import { clsx } from "clsx";

/**
 * Typography styles shared by the rich-text editor and read-only rendering.
 */
export const EDITOR_PROSE_CLASS = clsx(
  // Paragraphs
  "[&_p]:my-0 [&_p+p]:mt-2",
  // Headings
  "[&_h1]:text-[1.5em] [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h1:first-child]:mt-0",
  "[&_h2]:text-[1.25em] [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2 [&_h2:first-child]:mt-0",
  "[&_h3]:text-[1.125em] [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_h3:first-child]:mt-0",
  "[&_h4]:text-[1em] [&_h4]:font-semibold [&_h4]:mt-2 [&_h4]:mb-1 [&_h4:first-child]:mt-0",
  "[&_h5]:text-[0.875em] [&_h5]:font-semibold [&_h5]:mt-1 [&_h5]:mb-1",
  "[&_h6]:text-[0.75em] [&_h6]:font-semibold [&_h6]:mt-1 [&_h6]:mb-1",
  // Lists
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2",
  "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2",
  "[&_li]:my-0.5 [&_li_p]:my-0",
  // Blockquote
  "[&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-low [&_blockquote]:my-2",
  // Inline code
  "[&_code]:bg-hover [&_code]:rounded-sm [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_code]:font-mono",
  // Code block
  "[&_pre]:bg-ui [&_pre]:rounded-md [&_pre]:p-2 [&_pre]:my-2 [&_pre]:overflow-auto [&_pre]:font-mono [&_pre]:text-xs",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[1em]",
  // Horizontal rule
  "[&_hr]:my-3 [&_hr]:border-t",
  // Links
  "[&_a]:text-primary-low [&_a]:underline [&_a]:underline-offset-2",
  // Mentions
  "[&_.mention]:font-medium",
);
