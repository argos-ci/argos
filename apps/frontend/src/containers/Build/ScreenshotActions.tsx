import type { ReactNode } from "react";
import { captureException } from "@sentry/react";
import {
  CodeIcon,
  CopyIcon,
  DownloadIcon,
  EllipsisVerticalIcon,
  LinkIcon,
} from "lucide-react";
import { MenuTrigger, SubmenuTrigger } from "react-aria-components";
import { useClipboard } from "use-clipboard-copy";

import { Button } from "@/ui/Button";
import { Menu, MenuItem, MenuItemIcon } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { toast } from "@/ui/Toaster";
import { Tooltip } from "@/ui/Tooltip";
import { getErrorMessage } from "@/util/error";
import { fetchImage } from "@/util/image";

// Shared id so successive copies reuse a single toast instead of stacking.
const SCREENSHOT_COPY_TOAST_ID = "screenshot-copied";

/**
 * The actions menu floating over an image pane — the ellipsis button in the
 * pane's control stack, shared by the build's snapshots and a media's share
 * page so an image offers the same actions wherever it is inspected. Callers
 * fill it with {@link CopyImageSubmenu} / {@link DownloadImageSubmenu} entries.
 */
export function ImageActionsMenu(props: {
  tooltip: string;
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <MenuTrigger>
      <Tooltip side="left" content={props.tooltip}>
        <Button variant="secondary" iconOnly>
          <EllipsisVerticalIcon />
        </Button>
      </Tooltip>
      <Popover placement="bottom end">
        <Menu aria-label={props.ariaLabel}>{props.children}</Menu>
      </Popover>
    </MenuTrigger>
  );
}

/**
 * "Copy" submenu sharing the link and Markdown embed actions across image
 * panes.
 *
 * `publicUrl` should be the image's public (files.argos-ci.com CDN) URL — a
 * stable, shareable link — not an expiring signed original: a copied link or
 * Markdown embed needs to keep working for whoever it's shared with.
 */
export function CopyImageSubmenu(props: { publicUrl: string; alt: string }) {
  const { publicUrl, alt } = props;
  const clipboard = useClipboard();
  return (
    <SubmenuTrigger>
      <MenuItem>
        <MenuItemIcon>
          <CopyIcon />
        </MenuItemIcon>
        Copy
      </MenuItem>
      <Popover>
        <Menu aria-label="Copy image">
          <MenuItem
            onAction={() => {
              clipboard.copy(publicUrl);
              toast.success("Link copied", {
                id: SCREENSHOT_COPY_TOAST_ID,
                description: "The image link was copied to your clipboard.",
              });
            }}
          >
            <MenuItemIcon>
              <LinkIcon />
            </MenuItemIcon>
            Copy link
          </MenuItem>
          <MenuItem
            onAction={() => {
              clipboard.copy(`![${alt}](${publicUrl})`);
              toast.success("Markdown copied", {
                id: SCREENSHOT_COPY_TOAST_ID,
                description:
                  "The image embed as Markdown was copied to your clipboard.",
              });
            }}
          >
            <MenuItemIcon>
              <CodeIcon />
            </MenuItemIcon>
            Copy embed as Markdown
          </MenuItem>
        </Menu>
      </Popover>
    </SubmenuTrigger>
  );
}

/**
 * "Download" submenu grouping the download variants of an image pane.
 */
export function DownloadImageSubmenu(props: { children: ReactNode }) {
  return (
    <SubmenuTrigger>
      <MenuItem>
        <MenuItemIcon>
          <DownloadIcon />
        </MenuItemIcon>
        Download
      </MenuItem>
      <Popover>
        <Menu aria-label="Download image">{props.children}</Menu>
      </Popover>
    </SubmenuTrigger>
  );
}

export function downloadWithToast(promise: Promise<void>) {
  toast.promise(promise, {
    loading: "Downloading image…",
    success: "Image downloaded",
    error: (data) => {
      console.error(data);
      captureException(data);
      return getErrorMessage(data);
    },
  });
}

export function downloadBlob(blob: Blob, name: string) {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

export async function fetchBlob(url: string) {
  const response = await fetchImage(url);
  return response.blob();
}
