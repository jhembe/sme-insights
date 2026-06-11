import api from './client';
import { MemberRole } from '../store/business.store';

export type TeamMember = {
  id: string;
  userId: string;
  organizationId: string;
  role: MemberRole;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  joinedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
};

export type AddMemberInput = {
  email: string;
  firstName: string;
  lastName: string;
  role: Exclude<MemberRole, 'OWNER'>;
};

export type AddMemberResult = {
  member: TeamMember;
  tempPassword?: string;
};

export const teamApi = {
  listMembers: (orgId: string) =>
    api.get<TeamMember[]>(`/organizations/${orgId}/members`).then((r) => r.data),

  addMember: (orgId: string, data: AddMemberInput) =>
    api.post<AddMemberResult>(`/organizations/${orgId}/members`, data).then((r) => r.data),

  updateMember: (
    orgId: string,
    memberId: string,
    data: { role?: Exclude<MemberRole, 'OWNER'>; status?: 'ACTIVE' | 'SUSPENDED' },
  ) =>
    api.patch<TeamMember>(`/organizations/${orgId}/members/${memberId}`, data).then((r) => r.data),

  removeMember: (orgId: string, memberId: string) =>
    api.delete(`/organizations/${orgId}/members/${memberId}`),
};
