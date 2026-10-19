import { randomBytes } from "node:crypto";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { User } from "@/lib/db/models/user";
import type { ErrorCode } from "@/lib/errors";
import { connectDB } from "@/utils/connectDB";
import { hashPassword, verifyPassword } from "@/utils/auth";

const MIN_NAME = 3;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;
const MAX_FULL_NAME = 50; // the User model allows 50 characters for name
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

// Replaces `throw new Error(ERROR.X)`. Only a valid ErrorCode can be thrown.
// The client receives the code in `result.error` and shows APP_ERRORS[code].message.
function fail(code: ErrorCode): never {
  throw new Error(code);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === 11000
  );
}

const googleId = process.env.GOOGLE_CLIENT_ID;
const googleSecret = process.env.GOOGLE_CLIENT_SECRET;

/**
 * Authentication options for NextAuth, including session strategy and provider configurations.
 */
export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === "development", // Debug logs in development only
  session: { strategy: "jwt" }, // Use JWT for session handling
  providers: [
    CredentialsProvider({
      credentials: { email: {}, password: {}, name: {}, last_name: {} },
      async authorize(credentials) {
        const email = asString(credentials?.email).toLowerCase();
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        const name = asString(credentials?.name);
        const lastName = asString(credentials?.last_name);

        // Validate required credentials
        if (!email || !password || email.length > 254 || password.length > MAX_PASSWORD) {
          fail("INVALID_DATA");
        }

        // Connect to the database
        await connectDB();

        // Find the user in the database (passwordHash is hidden by default)
        const user = await User.findOne({ email }).select("+passwordHash");

        if (!user) {
          // Validate name and last name
          if (name.length < MIN_NAME) fail("NAME_AT_LEAST");
          if (lastName.length < MIN_NAME) fail("LAST_NAME_AT_LEAST");

          // Validate email format
          if (!EMAIL_PATTERN.test(email)) fail("INVALID_DATA");

          // Validate password length
          if (password.length < MIN_PASSWORD) fail("PASSWORD_AT_LEAST");

          // The User model has a single `name` field
          const fullName = `${name} ${lastName}`;
          if (fullName.length > MAX_FULL_NAME) fail("INVALID_DATA");

          try {
            // Hash the password before storing
            const created = await User.create({
              email,
              name: fullName,
              passwordHash: await hashPassword(password),
            });
            return { id: created._id.toString(), email: created.email, name: created.name };
          } catch (error) {
            // Two simultaneous sign-ups: the unique email index rejects the second
            if (isDuplicateKeyError(error)) fail("EMAIL_ALREADY_REGISTERED");
            throw error;
          }
        }

        // Verify password for existing users
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) fail("INVALID_CREDENTIALS");

        // Return user data for session
        return { id: user._id.toString(), email: user.email, name: user.name };
      },
    }),
    // Only enabled when both Google environment variables are set
    ...(googleId && googleSecret
      ? [GoogleProvider({ clientId: googleId, clientSecret: googleSecret })]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        // Only accept Google accounts whose email Google has verified
        const emailVerified = (profile as { email_verified?: boolean } | undefined)
          ?.email_verified;
        if (!user.email || emailVerified !== true) return false;

        // Connect to the database
        await connectDB();
        const email = user.email.trim().toLowerCase();
        const existingUser = await User.findOne({ email });

        // If user does not exist, create a new entry in the database
        if (!existingUser) {
          await User.create({
            email,
            name: (user.name?.trim() || email.split("@")[0]).slice(0, MAX_FULL_NAME),
            // Google users have no password. Store the hash of a random secret
            // nobody knows, so a password login can never open this account.
            passwordHash: await hashPassword(randomBytes(32).toString("hex")),
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "google") {
          // For Google, user.id is Google's id. We need OUR database id.
          const email = user.email?.trim().toLowerCase();
          if (email) {
            await connectDB();
            const dbUser = await User.findOne({ email });
            if (dbUser) token.id = dbUser._id.toString();
          }
        } else if (user.id) {
          token.id = user.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) session.user.id = token.id;
      return session;
    },
  },
};