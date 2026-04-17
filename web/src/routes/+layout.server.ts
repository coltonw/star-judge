import type { LayoutServerLoad } from './$types';

const ADMIN_EMAIL = 'coltonw@gmail.com';

export const load: LayoutServerLoad = async ({ request }) => {
  // Always show admin link in local dev
  if (import.meta.env.DEV) {
    return { isAdmin: true };
  }
  // In production, Cloudflare Access injects this header after successful auth
  const email = request.headers.get('cf-access-authenticated-user-email');
  return { isAdmin: email === ADMIN_EMAIL };
};
