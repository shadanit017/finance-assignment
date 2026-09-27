export interface HealthStatus {
  status: string;
  timestamp?: string;
  database?: string;
  details?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  googleId?: string;
  roleId: string;
  role?: {
    id: string;
    name: string;
    permissions: Array<{
      permission: {
        id: string;
        name: string;
      };
    }>;
  };
}

export interface AuthState {
  authenticated: boolean;
  user: User | null;
  loading: boolean;
}
