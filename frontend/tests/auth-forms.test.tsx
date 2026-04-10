import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";

import { ForgotPasswordForm, ResetPasswordForm, SignInForm, SignUpForm, VerificationActions } from "@/components/auth/forms";
import * as authModule from "@/lib/auth";

const pushMock = vi.fn();
const searchParamsState = new URLSearchParams();

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  useSearchParams: () => searchParamsState,
}));

function setSearchParams(params: Record<string, string>) {
  searchParamsState.forEach((_, key) => searchParamsState.delete(key));
  for (const [key, value] of Object.entries(params)) {
    searchParamsState.set(key, value);
  }
}

describe("auth form integrations", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
    setSearchParams({});
  });

  it("sign-in shows a backend error banner for invalid credentials", async () => {
    const authRequestMock = vi.spyOn(authModule, "authRequest").mockRejectedValue(new Error("Invalid email or password."));
    const user = userEvent.setup();

    render(<SignInForm />);

    await user.type(screen.getByLabelText("Email Address"), "parent@example.com");
    await user.type(screen.getByLabelText("Password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByText("Invalid email or password.")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
    expect(authRequestMock).toHaveBeenCalledWith(authModule.authRoutes.signIn, expect.any(Object));
  });

  it("sign-in redirects to verify-email when backend reports verification required", async () => {
    vi.spyOn(authModule, "authRequest").mockRejectedValue(new Error("Email verification required before sign-in."));
    const user = userEvent.setup();

    render(<SignInForm />);

    await user.type(screen.getByLabelText("Email Address"), "parent@example.com");
    await user.type(screen.getByLabelText("Password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/verify-email?email=parent%40example.com");
    });
  });

  it("sign-in shows success and redirects to the backend next path", async () => {
    vi.spyOn(authModule, "authRequest").mockResolvedValue({
      message: "Signed in successfully.",
      emailVerified: true,
      nextPath: "/portal",
    });
    const user = userEvent.setup();

    render(<SignInForm />);

    await user.type(screen.getByLabelText("Email Address"), "parent@example.com");
    await user.type(screen.getByLabelText("Password"), "Password123");
    await user.click(screen.getByLabelText("Keep me signed in for 30 days"));
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByText("Signed in successfully.")).toBeInTheDocument();
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/portal");
    });
  });

  it("sign-up blocks mismatched passwords on the client", async () => {
    const authRequestMock = vi.spyOn(authModule, "authRequest");
    const user = userEvent.setup();

    render(<SignUpForm />);

    await user.type(screen.getByLabelText("Email Address"), "parent@example.com");
    await user.type(screen.getByLabelText("Password"), "Password123");
    await user.type(screen.getByLabelText("Confirm Password"), "Mismatch123");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(await screen.findByText("Passwords must match.")).toBeInTheDocument();
    expect(authRequestMock).not.toHaveBeenCalled();
  });

  it("sign-up shows a duplicate-email backend error banner", async () => {
    vi.spyOn(authModule, "authRequest").mockRejectedValue(new Error("An account with that email already exists."));
    const user = userEvent.setup();

    render(<SignUpForm />);

    await user.type(screen.getByLabelText("Email Address"), "parent@example.com");
    await user.type(screen.getByLabelText("Password"), "Password123");
    await user.type(screen.getByLabelText("Confirm Password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    expect(await screen.findByText("An account with that email already exists.")).toBeInTheDocument();
  });

  it("sign-up redirects to verify-email with the verification token query", async () => {
    vi.spyOn(authModule, "authRequest").mockResolvedValue({
      message: "Account created. Check your email to verify your account.",
      verificationToken: "verify-token",
    });
    const user = userEvent.setup();

    render(<SignUpForm />);

    await user.type(screen.getByLabelText("Email Address"), "parent@example.com");
    await user.type(screen.getByLabelText("Password"), "Password123");
    await user.type(screen.getByLabelText("Confirm Password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/verify-email?email=parent%40example.com&token=verify-token");
    });
  });

  it("forgot-password redirects to the confirmation screen with email and token", async () => {
    vi.spyOn(authModule, "authRequest").mockResolvedValue({
      message: "If an account exists for that email, a password reset link is on the way.",
      resetToken: "reset-token",
    });
    const user = userEvent.setup();

    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Email Address"), "parent@example.com");
    await user.click(screen.getByRole("button", { name: "Send Reset Link" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/forgot-password/sent?email=parent%40example.com&token=reset-token");
    });
  });

  it("forgot-password shows a backend failure banner", async () => {
    vi.spyOn(authModule, "authRequest").mockRejectedValue(new Error("Unable to send reset link."));
    const user = userEvent.setup();

    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText("Email Address"), "parent@example.com");
    await user.click(screen.getByRole("button", { name: "Send Reset Link" }));

    expect(await screen.findByText("Unable to send reset link.")).toBeInTheDocument();
  });

  it("reset-password shows an error when the token is missing", async () => {
    const user = userEvent.setup();

    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText("New Password"), "Password123");
    await user.type(screen.getByLabelText("Confirm New Password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Save New Password" }));

    expect(await screen.findByText("This reset link is missing its token. Request a new password reset email.")).toBeInTheDocument();
  });

  it("reset-password blocks mismatched passwords before calling the backend", async () => {
    setSearchParams({ token: "reset-token" });
    const authRequestMock = vi.spyOn(authModule, "authRequest");
    const user = userEvent.setup();

    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText("New Password"), "Password123");
    await user.type(screen.getByLabelText("Confirm New Password"), "Mismatch123");
    await user.click(screen.getByRole("button", { name: "Save New Password" }));

    expect(await screen.findByText("Passwords must match.")).toBeInTheDocument();
    expect(authRequestMock).not.toHaveBeenCalled();
  });

  it("reset-password shows backend token errors", async () => {
    setSearchParams({ token: "expired-token" });
    vi.spyOn(authModule, "authRequest").mockRejectedValue(new Error("This reset link is invalid or expired."));
    const user = userEvent.setup();

    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText("New Password"), "Password123");
    await user.type(screen.getByLabelText("Confirm New Password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Save New Password" }));

    expect(await screen.findByText("This reset link is invalid or expired.")).toBeInTheDocument();
  });

  it("reset-password shows success and redirects to sign-in", async () => {
    setSearchParams({ token: "reset-token" });
    const nativeSetTimeout = globalThis.setTimeout;
    const setTimeoutMock = vi.spyOn(globalThis, "setTimeout").mockImplementation(((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      if (timeout === 1200 && typeof handler === "function") {
        handler(...args);
        return 0 as unknown as ReturnType<typeof setTimeout>;
      }

      return nativeSetTimeout(handler, timeout, ...args);
    }) as typeof setTimeout);
    vi.spyOn(authModule, "authRequest").mockResolvedValue({ message: "Password updated. Sign in with your new password." });
    const user = userEvent.setup();

    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText("New Password"), "Password123");
    await user.type(screen.getByLabelText("Confirm New Password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Save New Password" }));

    expect(await screen.findByText("Password updated. Sign in with your new password.")).toBeInTheDocument();
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/sign-in");
    });
    setTimeoutMock.mockRestore();
  });

  it("verify-email auto-verifies when a token is present", async () => {
    setSearchParams({ email: "parent@example.com", token: "verify-token" });
    const authRequestMock = vi.spyOn(authModule, "authRequest").mockResolvedValue({ message: "Email verified. You can now sign in." });

    render(<VerificationActions />);

    expect(await screen.findByText("Email verified. You can now sign in.")).toBeInTheDocument();
    expect(authRequestMock).toHaveBeenCalledWith("/auth/verify-email", expect.objectContaining({ method: "POST" }));
  });

  it("verify-email shows token verification errors", async () => {
    setSearchParams({ email: "parent@example.com", token: "expired-token" });
    vi.spyOn(authModule, "authRequest").mockRejectedValue(new Error("This verification link is invalid or expired."));

    render(<VerificationActions />);

    expect(await screen.findByText("This verification link is invalid or expired.")).toBeInTheDocument();
  });

  it("verify-email resend shows the development token message", async () => {
    setSearchParams({ email: "parent@example.com" });
    const authRequestMock = vi.spyOn(authModule, "authRequest") as Mock;
    authRequestMock.mockResolvedValue({
      message: "If that account exists and is not yet verified, a new verification link has been sent.",
      verificationToken: "verify-token",
    });
    const user = userEvent.setup();

    render(<VerificationActions />);

    await user.click(screen.getByRole("button", { name: "Resend verification" }));

    expect(await screen.findByText(/Development verification token: verify-token/)).toBeInTheDocument();
  });
});