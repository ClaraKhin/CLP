import SuperTokens from "supertokens-auth-react";
import ThirdParty, {
  Google,
  Github,
  Apple,
  Facebook,
  redirectToThirdPartyLogin,
} from "supertokens-auth-react/recipe/thirdparty";
import Session from "supertokens-auth-react/recipe/session";

export function initSuperTokens() {
  SuperTokens.init({
    appInfo: {
      appName: "Central SSO Portal",
      apiDomain: import.meta.env.VITE_SUPERTOKENS_API_DOMAIN || "http://localhost:3001",
      websiteDomain: window.location.origin,
      apiBasePath: "/auth",
      websiteBasePath: "/auth",
    },
    recipeList: [
      ThirdParty.init({
        signInAndUpFeature: {
          providers: [
            Google.init(),
            Github.init(),
            Apple.init(),
            Facebook.init(),
          ],
        },
      }),
      Session.init(),
    ],
  });
}

export { SuperTokens, ThirdParty, Session };

// Named social provider launchers for use in UI
export const SocialProviders = [
  { id: "google", label: "Google", color: "#4285f4", letterIcon: "G" },
  { id: "github", label: "GitHub", color: "#24292e", letterIcon: "" },
  { id: "apple", label: "Apple", color: "#1a1a1a", letterIcon: "" },
  { id: "facebook", label: "Facebook", color: "#1877f2", letterIcon: "f" },
  { id: "okta", label: "Okta", color: "#007dc1", letterIcon: "O" },
];

/**
 * Trigger a SuperTokens third-party sign-in redirect.
 * If the backend is not running, returns { ok: false, error } instead of throwing.
 */
export async function signInWithProvider(providerId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await redirectToThirdPartyLogin({ thirdPartyId: providerId });
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
