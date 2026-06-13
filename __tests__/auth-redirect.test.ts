describe('auth redirect helpers', () => {
  afterEach(() => {
    jest.resetModules();
    delete process.env.EXPO_PUBLIC_APP_URL;
  });

  it('uses the configured public app url on web', () => {
    process.env.EXPO_PUBLIC_APP_URL = 'https://demo.ledgerhome.app/';

    jest.doMock('react-native', () => ({
      Platform: { OS: 'web' },
    }));

    jest.isolateModules(() => {
      const { getPasswordResetRedirectUrl } = require('@/lib/auth-redirect');
      expect(getPasswordResetRedirectUrl()).toBe('https://demo.ledgerhome.app/auth/reset-password');
    });
  });

  it('falls back to the app scheme on native', () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
    }));

    jest.isolateModules(() => {
      const { getInviteRedirectUrl } = require('@/lib/auth-redirect');
      expect(getInviteRedirectUrl()).toBe('ledgerhome://auth/reset-password');
    });
  });
});
