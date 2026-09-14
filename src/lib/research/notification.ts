/**
 * Completion email for a research task.
 *
 * DeepResearch emails the address when the task finishes. The link in that
 * email points back to this app's report page for the task. The API only
 * honours https links; any other scheme makes the email fall back to the
 * platform's own report page, so the app origin must be https in production.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ResearchNotification {
  email: string;
  custom_url?: string;
}

/** Where completion emails should link. Set NEXT_PUBLIC_APP_URL to an https origin in production. */
export function researchReportLink(appOrigin: string): string | undefined {
  try {
    const origin = new URL(appOrigin);
    if (origin.protocol !== "https:") return undefined;
    return `${origin.origin}/research/{id}`;
  } catch {
    return undefined;
  }
}

export function buildResearchNotification(
  email: string | undefined,
  appOrigin: string
): ResearchNotification | undefined {
  const recipient = email?.trim();
  if (!recipient || !EMAIL_PATTERN.test(recipient)) return undefined;
  const link = researchReportLink(appOrigin);
  if (!link) {
    console.warn(
      `[research] App origin ${appOrigin} is not https; completion emails will link to the Valyu platform instead of this app.`
    );
    return { email: recipient };
  }
  return { email: recipient, custom_url: link };
}
