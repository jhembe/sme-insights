import api from './client';

export type RegisterPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  organizationName: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthResponse = {
  user: { id: string; email: string; firstName: string; lastName: string; isVerified: boolean };
  accessToken: string;
  refreshToken: string;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export type ForgotPasswordPayload = { email: string };
export type ResetPasswordPayload = { email: string; token: string; newPassword: string };

export const authApi = {
  register: (data: RegisterPayload) => api.post<AuthResponse>('/auth/register', data),
  login: (data: LoginPayload) => api.post<AuthResponse>('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (data: ChangePasswordPayload) => api.post('/auth/change-password', data),
  forgotPassword: (email: string) => api.post<{ message: string }>('/auth/forgot-password', { email }),
  resetPassword: (data: ResetPasswordPayload) => api.post<{ message: string }>('/auth/reset-password', data),
  verifyEmail: (email: string, token: string) =>
    api.get<{ message: string }>('/auth/verify-email', { params: { email, token } }),
  resendVerification: () => api.post<{ message: string }>('/auth/resend-verification'),
};
