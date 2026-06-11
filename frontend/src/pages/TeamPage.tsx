import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { teamApi, TeamMember, AddMemberInput } from '../api/team';
import { useBusinessStore, MemberRole } from '../store/business.store';
import { useRole } from '../hooks/useRole';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Navigate } from 'react-router-dom';

const ROLE_LABELS: Record<MemberRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  STAFF: 'Staff',
};

const ROLE_COLORS: Record<MemberRole, string> = {
  OWNER: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  MANAGER: 'bg-brand-50 text-brand-700',
  STAFF: 'bg-gray-100 text-gray-600',
};

const STATUS_COLORS = {
  ACTIVE: 'bg-green-50 text-green-700',
  INVITED: 'bg-amber-50 text-amber-700',
  SUSPENDED: 'bg-red-50 text-red-600',
};

// ─── Add member modal ──────────────────────────────────────────

function AddMemberModal({
  open,
  onClose,
  orgId,
}: {
  open: boolean;
  onClose: () => void;
  orgId: string;
}) {
  const qc = useQueryClient();
  const { isOwner } = useRole();
  const [form, setForm] = useState<AddMemberInput>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'STAFF',
  });
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const add = useMutation({
    mutationFn: () => teamApi.addMember(orgId, form),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['team', orgId] });
      if (res.tempPassword) {
        setTempPassword(res.tempPassword);
      } else {
        handleClose();
      }
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Failed to add member.');
    },
  });

  const handleClose = () => {
    setForm({ email: '', firstName: '', lastName: '', role: 'STAFF' });
    setError('');
    setTempPassword(null);
    setCopied(false);
    onClose();
  };

  const handleCopy = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
    }
  };

  if (tempPassword) {
    return (
      <Modal open={open} onClose={handleClose} title="Member added" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            A new account was created for <strong>{form.email}</strong>. Share this
            temporary password with them — they can change it after logging in.
          </p>
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <code className="flex-1 text-sm font-mono text-gray-900 select-all">{tempPassword}</code>
            <button
              onClick={handleCopy}
              className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700 transition"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Share this via WhatsApp or SMS. They log in at{' '}
            <span className="font-medium text-gray-600">{window.location.origin}/login</span>
          </p>
          <Button className="w-full" onClick={handleClose}>Done</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add team member" size="sm">
      <form
        onSubmit={(e) => { e.preventDefault(); setError(''); add.mutate(); }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First name *"
            placeholder="John"
            value={form.firstName}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            autoFocus
          />
          <Input
            label="Last name *"
            placeholder="Doe"
            value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
          />
        </div>
        <Input
          label="Email *"
          type="email"
          placeholder="staff@example.com"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <Select
          label="Role *"
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Exclude<MemberRole, 'OWNER'> }))}
        >
          <option value="STAFF">Staff — can only create sales</option>
          <option value="MANAGER">Manager — sales, expenses, products, analytics</option>
          {isOwner && <option value="ADMIN">Admin — full access except team ownership</option>}
        </Select>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="ghost" className="flex-1" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={add.isPending}
            disabled={!form.email.trim() || !form.firstName.trim() || !form.lastName.trim()}
            className="flex-1"
          >
            Add member
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Edit role modal ───────────────────────────────────────────

function EditRoleModal({
  member,
  orgId,
  onClose,
}: {
  member: TeamMember;
  orgId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { isOwner } = useRole();
  const [role, setRole] = useState<Exclude<MemberRole, 'OWNER'>>(
    member.role as Exclude<MemberRole, 'OWNER'>,
  );
  const [error, setError] = useState('');

  const update = useMutation({
    mutationFn: () => teamApi.updateMember(orgId, member.id, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team', orgId] });
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Failed to update role.');
    },
  });

  return (
    <Modal open onClose={onClose} title="Edit role" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Changing role for <strong>{member.user.firstName} {member.user.lastName}</strong>
        </p>
        <Select
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value as Exclude<MemberRole, 'OWNER'>)}
        >
          <option value="STAFF">Staff</option>
          <option value="MANAGER">Manager</option>
          {isOwner && <option value="ADMIN">Admin</option>}
        </Select>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        <div className="flex gap-3">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={update.isPending} className="flex-1" onClick={() => update.mutate()}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main page ─────────────────────────────────────────────────

export function TeamPage() {
  const { organizationId } = useBusinessStore();
  const { canManageTeam, isOwner } = useRole();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);

  if (!canManageTeam) return <Navigate to="/dashboard" replace />;

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team', organizationId],
    queryFn: () => teamApi.listMembers(organizationId!),
    enabled: !!organizationId,
  });

  const remove = useMutation({
    mutationFn: (memberId: string) => teamApi.removeMember(organizationId!, memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team', organizationId] }),
  });

  const suspend = useMutation({
    mutationFn: ({ memberId, status }: { memberId: string; status: 'ACTIVE' | 'SUSPENDED' }) =>
      teamApi.updateMember(organizationId!, memberId, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team', organizationId] }),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {members.length} member{members.length !== 1 ? 's' : ''} in your organization
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>+ Add member</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          {[0, 1, 2].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
        </div>
      ) : (
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm overflow-hidden">
          <ul className="divide-y divide-gray-50">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-4 px-5 py-4">
                <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 text-sm font-bold flex items-center justify-center shrink-0">
                  {m.user.firstName[0]}{m.user.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {m.user.firstName} {m.user.lastName}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{m.user.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[m.role]}`}>
                    {ROLE_LABELS[m.role]}
                  </span>
                  {m.status !== 'ACTIVE' && (
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[m.status]}`}>
                      {m.status.toLowerCase()}
                    </span>
                  )}
                </div>
                {m.role !== 'OWNER' && (isOwner || m.role !== 'ADMIN') && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditing(m)}
                      className="text-xs font-medium text-gray-400 hover:text-brand-600 px-2 py-1 rounded transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        suspend.mutate({
                          memberId: m.id,
                          status: m.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                        })
                      }
                      className="text-xs font-medium text-gray-400 hover:text-amber-600 px-2 py-1 rounded transition"
                    >
                      {m.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                    </button>
                    {isOwner && (
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${m.user.firstName} from the team?`)) {
                            remove.mutate(m.id);
                          }
                        }}
                        className="text-xs font-medium text-gray-400 hover:text-red-500 px-2 py-1 rounded transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-gray-50 rounded-2xl p-5 text-sm text-gray-500 space-y-1.5">
        <p className="font-medium text-gray-700">Role permissions</p>
        <p><span className="font-medium text-gray-600">Staff:</span> Can create sales only</p>
        <p><span className="font-medium text-gray-600">Manager:</span> Sales, expenses, products, and analytics</p>
        <p><span className="font-medium text-gray-600">Admin:</span> Full access including import/export and team management, cannot remove other admins</p>
        <p><span className="font-medium text-gray-600">Owner:</span> Full access</p>
      </div>

      {organizationId && (
        <AddMemberModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          orgId={organizationId}
        />
      )}
      {editing && organizationId && (
        <EditRoleModal
          member={editing}
          orgId={organizationId}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
