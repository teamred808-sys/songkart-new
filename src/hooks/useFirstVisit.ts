import { useEffect, useCallback } from 'react';

const HOMEPAGE_SEEN_KEY = 'hasSeenHomepage';

export const useFirstVisit = () => {
  const hasSeenHomepage = (): boolean => {
    return sessionStorage.getItem(HOMEPAGE_SEEN_KEY) === 'true';
  };

  const markHomepageSeen = useCallback(() => {
    sessionStorage.setItem(HOMEPAGE_SEEN_KEY, 'true');
  }, []);

  return {
    hasSeenHomepage,
    markHomepageSeen,
  };
};

export const useMarkHomepageSeen = () => {
  const { markHomepageSeen } = useFirstVisit();

  useEffect(() => {
    markHomepageSeen();
  }, [markHomepageSeen]);
};
