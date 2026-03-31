import ky from 'ky';

export const apiClient = ky.create({
  prefixUrl: '/api',
  credentials: 'include',
  hooks: {
    beforeError: [
      async (error) => {
        if (!error.response) return error;
        try {
          const body = await error.response.clone().json() as { code?: string };
          if (body.code === 'ONBOARDING_INCOMPLETE') {
            window.location.replace('/onboarding');
          }
        } catch {
          // non-JSON response, ignore
        }
        return error;
      },
    ],
  },
});
