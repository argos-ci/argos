import { GoogleUserProfile } from "@/google/auth";

import { GoogleUser } from "../models/GoogleUser";
import { getPartialModelUpdate } from "../util/update";

export async function getOrCreateGoogleUser(
  profile: GoogleUserProfile,
  data?: {
    lastLoggedAt?: string;
  },
): Promise<GoogleUser> {
  const existing = await GoogleUser.query().findOne({
    googleId: profile.id,
  });
  if (existing) {
    const toUpdate = getPartialModelUpdate(existing, {
      name: profile.name,
      primaryEmail: profile.primaryEmail,
      emails: profile.emails,
      ...data,
    });
    if (toUpdate) {
      return existing.$query().patchAndFetch(toUpdate);
    }
    return existing;
  }

  return GoogleUser.query().insertAndFetch({
    googleId: profile.id,
    name: profile.name,
    primaryEmail: profile.primaryEmail,
    emails: profile.emails,
    ...data,
  });
}
