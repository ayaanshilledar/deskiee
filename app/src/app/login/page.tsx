import Link from "next/link";

export const metadata = {
  title: "Sign in — Deskie",
  description: "Sign in to your Deskie sandbox workspace.",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#090a0d] text-[#e6e8ec] flex flex-col justify-between selection:bg-neutral-800 selection:text-white px-6">
      {/* Minimal Top Nav */}
      <header className="h-16 flex items-center justify-between max-w-5xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Deskie"
            className="w-7 h-7 rounded-md object-contain"
          />
          <span className="text-sm font-semibold tracking-tight text-white">Deskie</span>
        </Link>
        <Link
          href="/"
          className="text-xs text-neutral-400 hover:text-white transition-colors"
        >
          &larr; Back to home
        </Link>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-sm p-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] shadow-2xl flex flex-col items-center text-center">
          {/* Logo Badge */}
          <div className="mb-6 p-2 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <img
              src="/logo.png"
              alt="Deskie"
              className="w-8 h-8 rounded-md object-contain"
            />
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-white mb-2">
            Welcome to Deskie
          </h1>
          <p className="text-xs text-neutral-400 leading-relaxed mb-8">
            Access your isolated developer sandboxes and workspace sessions.
          </p>

          {/* Login with GitHub Button */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-white text-black font-medium text-xs hover:bg-neutral-200 transition-colors cursor-pointer shadow-xs"
          >
            <svg
              className="w-4 h-4 fill-current shrink-0"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span>Continue with GitHub</span>
          </button>

          {/* Switch to Signup */}
          <div className="mt-6 text-xs text-neutral-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-white hover:underline font-medium ml-1"
            >
              Sign up
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-14 flex items-center justify-center text-xs text-neutral-500">
        <span>Protected sandbox workspace environment</span>
      </footer>
    </div>
  );
}
