import { OAuth2Client } from "google-auth-library";

const scopes = ["openid", "email", "profile"];

export const hasGoogleOAuthConfig = (): boolean =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);

export const createGoogleOAuthClient = (): OAuth2Client =>
  new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);

export const createGoogleLoginUrl = (state: string): string =>
  createGoogleOAuthClient().generateAuthUrl({
    prompt: "select_account",
    scope: scopes,
    state
  });

export const readVerifiedGoogleEmail = async (code: string): Promise<string> => {
  const client = createGoogleOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.id_token) {
    throw new Error("Google did not return an ID token");
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  const email = ticket.getPayload()?.email;

  if (!email) {
    throw new Error("Google account has no email");
  }

  return email;
};
