import { WarningCircle } from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";
import { CloudnonicMark } from "../brand/CloudnonicMark";

interface SignInProps {
  onSubmit: (password: string) => void;
  pending: boolean;
  error: string | null;
}

export const SignIn = ({ onSubmit, pending, error }: SignInProps) => {
  const [password, setPassword] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(password);
  };

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <form
        onSubmit={submit}
        className="w-full max-w-[23rem] rounded-panel border border-line bg-panel px-6 py-7"
      >
        <p className="flex items-center gap-2.5 text-ink">
          <CloudnonicMark className="h-[18px] w-auto" />
          <span className="text-[15px] font-semibold tracking-[-0.01em]">Delivery Metrics</span>
        </p>
        <h1 className="mt-6 text-[1.5rem] leading-[1.15] font-bold tracking-[-0.02em] text-balance text-ink">
          Tensorparc's deploys, lead time and failures.
        </h1>
        <p className="mt-2 text-[14px] text-body">Sign in with the team's shared password.</p>

        <label htmlFor="password" className="mt-6 block text-[13px] font-semibold text-ink">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "password-error" : undefined}
          className="mt-1.5 block w-full rounded-control border border-line-strong bg-panel px-3 py-2 text-[16px] text-ink transition-colors duration-150 ease-out focus:border-ink aria-invalid:border-failed"
        />
        {error && (
          <p
            id="password-error"
            role="alert"
            className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-failed"
          >
            <WarningCircle size={16} weight="bold" aria-hidden />
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="mt-5 w-full rounded-control bg-ink px-4 py-2.5 text-[14px] font-semibold text-panel transition-[background-color,scale] duration-150 ease-out hover:bg-ink/90 disabled:cursor-progress disabled:bg-ink/75 motion-safe:active:scale-[0.98]"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
};
