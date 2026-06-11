import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function ChangePasswordPage() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      authApi.changePassword({ currentPassword: form.current, newPassword: form.next }),
    onSuccess: () => {
      setSuccess(true);
      setForm({ current: '', next: '', confirm: '' });
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Failed to change password.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (form.next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (form.next !== form.confirm) {
      setError('New passwords do not match.');
      return;
    }
    mutate();
  };

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Change password</h1>
        <p className="text-sm text-gray-500 mt-0.5">Update your login password.</p>
      </div>

      <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Current password"
            type="password"
            value={form.current}
            onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
            autoComplete="current-password"
          />
          <Input
            label="New password"
            type="password"
            value={form.next}
            onChange={(e) => setForm((f) => ({ ...f, next: e.target.value }))}
            autoComplete="new-password"
          />
          <Input
            label="Confirm new password"
            type="password"
            value={form.confirm}
            onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
            autoComplete="new-password"
          />

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
          {success && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              Password changed successfully.
            </p>
          )}

          <Button
            type="submit"
            loading={isPending}
            disabled={!form.current || !form.next || !form.confirm}
            className="w-full mt-1"
          >
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
}
