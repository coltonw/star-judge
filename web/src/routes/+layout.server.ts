import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ request }) => {
  // Always show admin link in local dev
  if (import.meta.env.DEV) {
    return { isAdmin: true };
  }

  // On pages.dev, always show the Admin link — CF Access protects the actual admin routes.
  // The email header is only injected on CF-Access-protected paths, not the root layout.
  return { isAdmin: request.headers.get('Host') === 'star-judge.pages.dev' };
};
