export type UserRole =
  | 'manager'
  | 'employee'
  | 'agricultural_engineer'
  | 'customer'
  | 'supplier'
  | 'delivery_company';

export interface AuthState {
  token: string | null;
  roles: UserRole[];
  userId: string | null;
}










