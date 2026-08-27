import {
  verifyDeveloperKey,
  isDeveloperEmail,
  createDeveloperUser,
  getDeveloperSession,
  setDeveloperSession,
  clearDeveloperSession,
  isDeveloperUser,
  DEV_RESTRICTION_MESSAGE,
  DEVELOPER_MASTER_PASSWORD
} from '../../utils/devAuth';

describe('Developer Authentication & IP Protection Utility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('correctly validates sole authorized developer master password', () => {
    expect(DEVELOPER_MASTER_PASSWORD).toBe('Pandey001#887283#');
    expect(verifyDeveloperKey('Pandey001#887283#')).toBe(true);
    expect(verifyDeveloperKey(' Pandey001#887283# ')).toBe(true);
    expect(verifyDeveloperKey('wrong-key')).toBe(false);
    expect(verifyDeveloperKey('UT3AV-SUJAL-DEV')).toBe(false);
    expect(verifyDeveloperKey('2026')).toBe(false);
    expect(verifyDeveloperKey('')).toBe(false);
    expect(verifyDeveloperKey(null)).toBe(false);
  });

  test('validates developer email whitelist', () => {
    expect(isDeveloperEmail('ut3av@plannify.dev')).toBe(true);
    expect(isDeveloperEmail('sujal@plannify.dev')).toBe(true);
    expect(isDeveloperEmail('developer@plannify.dev')).toBe(true);
    expect(isDeveloperEmail('outsider@random.com')).toBe(false);
    expect(isDeveloperEmail('')).toBe(false);
  });

  test('creates developer user object with full admin privileges', () => {
    const devUser = createDeveloperUser('Ut3av & SujaL');
    expect(devUser.isDeveloper).toBe(true);
    expect(devUser.role).toBe('Admin');
    expect(devUser.name).toBe('Ut3av & SujaL');
    expect(devUser.designation).toBe('Lead Developer & IP Owner');
  });

  test('persists and retrieves developer session in localStorage', () => {
    expect(getDeveloperSession()).toBeNull();
    const user = createDeveloperUser();
    setDeveloperSession(user);
    const retrieved = getDeveloperSession();
    expect(retrieved).not.toBeNull();
    expect(retrieved.isDeveloper).toBe(true);
    expect(retrieved.name).toBe('Ut3av & SujaL');

    clearDeveloperSession();
    expect(getDeveloperSession()).toBeNull();
  });

  test('identifies developer users correctly', () => {
    const devUser = { isDeveloper: true, email: 'ut3av@plannify.dev' };
    const normalUser = { isDeveloper: false, email: 'faculty@lnctu.ac.in' };
    expect(isDeveloperUser(devUser)).toBe(true);
    expect(isDeveloperUser(normalUser)).toBe(false);
    expect(isDeveloperUser(null)).toBe(false);
  });

  test('contains correct intellectual property notice message', () => {
    expect(DEV_RESTRICTION_MESSAGE).toContain('Ut3av & SujaL');
    expect(DEV_RESTRICTION_MESSAGE).toContain('intellectual property');
  });
});
