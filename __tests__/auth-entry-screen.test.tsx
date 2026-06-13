import { fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/components/auth-shell', () => ({
  AuthShell: ({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) => (
    <>
      <>{title}</>
      <>{subtitle}</>
      {children}
    </>
  ),
}));

describe('AuthEntryScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders both role entry actions and routes to tenant login', async () => {
    const { getByText } = render(require('@/app/auth/index').default());

    expect(getByText('Tenant sign in')).toBeTruthy();
    expect(getByText('Admin sign in')).toBeTruthy();

    fireEvent.press(getByText('Tenant sign in'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/auth/login',
      params: { role: 'tenant' },
    });
  });

  it('routes to admin login from the admin action', () => {
    const { getByText } = render(require('@/app/auth/index').default());

    fireEvent.press(getByText('Admin sign in'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/auth/login',
      params: { role: 'admin' },
    });
  });
});
