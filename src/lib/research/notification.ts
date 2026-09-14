/**
 * Completion email for a research task.
 *
 * DeepResearch emails the address when the task finishes. The link in that
 * email points back to this app's report page for the task.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ResearchNotification {
  email: string;
  custom_url: string;
}

export function buildResearchNotification(
  email: string | undefined,
  appOrigin: string
): ResearchNotification | undefined {
  const recipient = email?.trim();
  if (!recipient || !EMAIL_PATTERN.test(recipient)) return undefined;
  try {
    const origin = new URL(appOrigin);
    if (!["http:", "https:"].includes(origin.protocol)) return undefined;
    return { email: recipient, custom_url: `${origin.origin}/research/{id}` };
  } catch {
    return undefined;
  }
}
