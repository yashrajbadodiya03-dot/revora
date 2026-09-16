"use client";

import { FormEvent, useState } from "react";
import { createClient } from "../../lib/supabase";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/";
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setGoogleLoading(false);
      return;
    }

    if (data?.url) {
      window.location.assign(data.url);
    }
  }

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        .revora-login {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(79, 70, 229, 0.16),
              transparent 32%
            ),
            #07090d;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          font-family: Arial, Helvetica, sans-serif;
        }

        .revora-login-inner {
          width: 100%;
          max-width: 400px;
        }

        .revora-brand {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 11px;
          margin-bottom: 42px;
        }

        .revora-logo {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: #ffffff;
          color: #080a0e;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
          font-weight: 800;
        }

        .revora-brand-name {
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 3px;
        }

        .revora-brand-sub {
          margin-top: 3px;
          color: #626975;
          font-size: 9px;
          letter-spacing: 1.5px;
        }

        .revora-heading {
          text-align: center;
          margin-bottom: 26px;
        }

        .revora-heading h1 {
          margin: 0;
          font-size: 30px;
          line-height: 1.15;
          letter-spacing: -0.8px;
          font-weight: 650;
        }

        .revora-heading p {
          margin: 9px 0 0;
          color: #777f8c;
          font-size: 14px;
        }

        .revora-card {
          background: rgba(14, 18, 25, 0.96);
          border: 1px solid #1c222c;
          border-radius: 18px;
          padding: 26px;
          box-shadow:
            0 30px 80px rgba(0, 0, 0, 0.45),
            inset 0 1px 0 rgba(255, 255, 255, 0.025);
        }

        .google-button {
          width: 100%;
          height: 48px;
          border: 1px solid #d9dce1;
          border-radius: 10px;
          background: #ffffff;
          color: #111318;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.15s ease;
        }

        .google-button:hover {
          background: #f1f2f4;
        }

        .google-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 24px 0;
        }

        .divider-line {
          height: 1px;
          flex: 1;
          background: #20252d;
        }

        .divider-text {
          color: #555c67;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 2px;
        }

        .field {
          margin-bottom: 18px;
        }

        .field label {
          display: block;
          margin-bottom: 8px;
          color: #a2a9b4;
          font-size: 12px;
          font-weight: 600;
        }

        .field input {
          width: 100%;
          height: 48px;
          padding: 0 14px;
          border: 1px solid #242a34;
          border-radius: 10px;
          outline: none;
          background: #090c11;
          color: #ffffff;
          font-size: 14px;
          transition: 0.15s ease;
        }

        .field input::placeholder {
          color: #454c57;
        }

        .field input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .signin-button {
          width: 100%;
          height: 48px;
          margin-top: 4px;
          border: 0;
          border-radius: 10px;
          background: #ffffff;
          color: #080a0e;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.15s ease;
        }

        .signin-button:hover {
          background: #e9eaed;
        }

        .signin-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-box {
          margin-bottom: 18px;
          padding: 11px 13px;
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.07);
          color: #f87171;
          font-size: 13px;
          line-height: 1.4;
        }

        .signup-text {
          margin-top: 24px;
          text-align: center;
          color: #656d79;
          font-size: 13px;
        }

        .signup-text a {
          color: #ffffff;
          font-weight: 600;
          text-decoration: none;
        }

        .signup-text a:hover {
          color: #a5b4fc;
        }

        .footer {
          margin-top: 28px;
          text-align: center;
          color: #303640;
          font-size: 10px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
      `}</style>

      <main className="revora-login">
        <div className="revora-login-inner">
          <div className="revora-brand">
            <div className="revora-logo">R</div>

            <div>
              <div className="revora-brand-name">REVORA</div>
              <div className="revora-brand-sub">REVENUE RECOVERY</div>
            </div>
          </div>

          <div className="revora-heading">
            <h1>Welcome back</h1>
            <p>Sign in to your Revora workspace.</p>
          </div>

          <div className="revora-card">
            <button
              type="button"
              className="google-button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M21.8 12.2c0-.8-.07-1.55-.22-2.28H12v4.32h5.5a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.04-4.4 3.04-7.68Z"
                  fill="#4285F4"
                />
                <path
                  d="M12 22c2.76 0 5.07-.91 6.76-2.47l-3.3-2.56c-.91.61-2.07.97-3.46.97-2.65 0-4.9-1.8-5.71-4.22H3.87v2.64A10.2 10.2 0 0 0 12 22Z"
                  fill="#34A853"
                />
                <path
                  d="M6.29 13.72A6.13 6.13 0 0 1 5.97 12c0-.6.11-1.18.32-1.72V7.64H3.87A10.2 10.2 0 0 0 1.8 12c0 1.64.39 3.19 1.07 4.36l3.42-2.64Z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 6.06c1.5 0 2.84.52 3.9 1.54l2.93-2.93C17.06 3.05 14.76 2 12 2a10.2 10.2 0 0 0-8.13 4.64l3.42 2.64C8.09 7.86 9.34 6.06 12 6.06Z"
                  fill="#EA4335"
                />
              </svg>

              {googleLoading ? "Connecting..." : "Continue with Google"}
            </button>

            <div className="divider">
              <div className="divider-line" />
              <span className="divider-text">OR</span>
              <div className="divider-line" />
            </div>

            <form onSubmit={handleLogin}>
              <div className="field">
                <label htmlFor="email">Email</label>

                <input
                  id="email"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com"
                  autoComplete="email"
                />
              </div>

              <div className="field">
                <label htmlFor="password">Password</label>

                <input
                  id="password"
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>

              {error && <div className="error-box">{error}</div>}

              <button
                type="submit"
                className="signin-button"
                disabled={loading || googleLoading}
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>

          <div className="signup-text">
            Don&apos;t have an account?{" "}
            <a href="/signup">Create one</a>
          </div>

          <div className="footer">
            Revora · Revenue Recovery Platform
          </div>
        </div>
      </main>
    </>
  );
}