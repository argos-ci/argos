import { transaction } from "@/database";
import { Account } from "@/database/models";
import {
  consumeUpload,
  deletePublicFile,
  storePublicFile,
} from "@/storage/public-files";

import { renderAvatarImage } from "./avatar-image";

async function storeAvatarImage(image: Buffer): Promise<string> {
  return storePublicFile({
    folder: "avatars",
    body: image,
    contentType: "image/png",
  });
}

/**
 * Point the account at a new avatar image, or at none, and delete the one it
 * replaces.
 */
async function swapAvatarKey(
  accountId: string,
  avatarKey: string | null,
): Promise<Account> {
  const { updated, previousKey } = await transaction(async (trx) => {
    const current = await Account.query(trx)
      .findById(accountId)
      .forUpdate()
      .throwIfNotFound();
    // Read before the patch, which writes the new key onto `current`.
    const previousKey = current.avatarKey;
    const updated = await current.$query(trx).patchAndFetch({ avatarKey });
    return { updated, previousKey };
  });
  if (previousKey) {
    await deletePublicFile(previousKey);
  }
  return updated;
}

/**
 * Set the account's avatar from an image the user uploaded, replacing the one
 * it has.
 */
export async function setAccountAvatarFromUpload(args: {
  account: Account;
  userId: string;
  uploadKey: string;
}): Promise<Account> {
  const key = await consumeUpload(
    { userId: args.userId, key: args.uploadKey },
    async (body) => storeAvatarImage(await renderAvatarImage(body)),
  );
  return swapAvatarKey(args.account.id, key);
}

/**
 * Remove the avatar set on Argos, so the account falls back to the one from
 * GitHub or to its initial.
 */
export async function removeAccountAvatar(account: Account): Promise<Account> {
  return swapAvatarKey(account.id, null);
}

/**
 * Set the account's avatar only when it has none of its own and none from
 * GitHub: an image picked up automatically never replaces one somebody chose.
 */
export async function setDefaultAccountAvatar(args: {
  accountId: string;
  image: Buffer;
}): Promise<void> {
  // Many favicons are a dark mark on a transparent background, which would
  // vanish on the dark theme.
  const key = await storeAvatarImage(
    await renderAvatarImage(args.image, { background: "#fff" }),
  );
  const patched = await Account.query()
    .findById(args.accountId)
    .whereNull("avatarKey")
    .whereNull("githubAccountId")
    .patch({ avatarKey: key });
  if (patched === 0) {
    await deletePublicFile(key);
  }
}
