'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { login } from './actions';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Signing in…
        </>
      ) : (
        'Sign in'
      )}
    </Button>
  );
}

function PasswordField({ disabled }: { disabled?: boolean }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <Label htmlFor="password">Password</Label>
      <div className="relative mt-1">
        <Input
          id="password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          required
          autoComplete="current-password"
          className="pr-10"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-ink disabled:opacity-50"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          tabIndex={-1}
          disabled={disabled}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <Eye className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}

function FormFields() {
  const { pending } = useFormStatus();

  return (
    <>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="mt-1"
          disabled={pending}
        />
      </div>
      <PasswordField disabled={pending} />
      <SubmitButton />
    </>
  );
}

export function LoginForm({ next }: { next?: string }) {
  return (
    <form action={login} className="mt-8 space-y-4">
      <input type="hidden" name="next" value={next || '/cms'} />
      <FormFields />
    </form>
  );
}
