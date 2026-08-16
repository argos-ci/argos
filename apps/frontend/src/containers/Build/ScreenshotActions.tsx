import type { ReactNode } from "react";
import { captureException } from "@sentry/react";
import {
  CodeIcon,
  CopyIcon,
  DownloadIcon,
  EllipsisVerticalIcon,
  LinkIcon,
} from "lucide-react";
import { useClipboard } from "use-clipboard-copy";

import { Button } from "@/ui/Button";
import {
  Menu,
  MenuItem,
  MenuRoot,
  MenuTrigger,
  SubMenu,
  SubMenuContent,
} from "@/ui/menu-kit";
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
 * fill it with {@link getCopyImageSubmenu} / {@link getDownloadImageSubmenu}.
 */
export function ImageActionsMenu(props: {
  tooltip: string;
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <MenuRoot>
      <Tooltip side="left" content={props.tooltip}>
        <MenuTrigger>
          <Button variant="secondary" iconOnly>
            <EllipsisVerticalIcon />
          </Button>
        </MenuTrigger>
      </Tooltip>
      <Menu side="bottom" align="end" aria-label={props.ariaLabel}>
        {props.children}
      </Menu>
    </MenuRoot>
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
/** A function, not a component: the menu it fills reads its children. */
export function getCopyImageSubmenu(props: { publicUrl: string; alt: string }) {
  const { publicUrl, alt } = props;
  const clipboard = useClipboard();
  return (
    <SubMenu>
      <MenuItem icon={<CopyIcon />}>Copy</MenuItem>
      <SubMenuContent>
        <MenuItem
          icon={<LinkIcon />}
          onAction={() => {
            clipboard.copy(publicUrl);
            toast.success("Link copied", {
              id: SCREENSHOT_COPY_TOAST_ID,
              description: "The image link was copied to your clipboard.",
            });
          }}
        >
          Copy link
        </MenuItem>
        <MenuItem
          icon={<CodeIcon />}
          onAction={() => {
            clipboard.copy(`![${alt}](${publicUrl})`);
            toast.success("Markdown copied", {
              id: SCREENSHOT_COPY_TOAST_ID,
              description:
                "The image embed as Markdown was copied to your clipboard.",
            });
          }}
        >
          Copy embed as Markdown
        </MenuItem>
      </SubMenuContent>
    </SubMenu>
  );
}

/**
 * "Download" submenu grouping the download variants of an image pane.
 */
/** A function, not a component: the menu it fills reads its children. */
export function getDownloadImageSubmenu(children: ReactNode) {
  return (
    <SubMenu>
      <MenuItem icon={<DownloadIcon />}>Download</MenuItem>
      <SubMenuContent>{children}</SubMenuContent>
    </SubMenu>
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
