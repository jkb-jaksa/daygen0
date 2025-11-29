import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type SetJobIdOptions = {
  replace?: boolean;
};

const JOB_ID_PARAM = 'jobId';
const LEGACY_JOB_ROUTE_PREFIX = '/job/';

const extractLegacyJobId = (pathname: string | undefined): string | null => {
  if (!pathname || !pathname.startsWith(LEGACY_JOB_ROUTE_PREFIX)) {
    return null;
  }

  const suffix = pathname.slice(LEGACY_JOB_ROUTE_PREFIX.length);
  const segment = suffix.split('/')[0]?.trim();
  if (!segment) {
    return null;
  }

  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

export function useJobIdSearch(paramKey: string = JOB_ID_PARAM) {
  const navigate = useNavigate();
  const location = useLocation();
  const lastJobIdRef = useRef<string | null>(null);

  const currentJobId = useMemo(() => {
    const params = new URLSearchParams(location.search ?? '');
    const value = params.get(paramKey)?.trim();
    if (value && value.length > 0) {
      return value;
    }

    return extractLegacyJobId(location.pathname);
  }, [location.pathname, location.search, paramKey]);

  useEffect(() => {
    lastJobIdRef.current = currentJobId;
  }, [currentJobId]);

  const setJobId = useCallback(
    (jobId: string, options: SetJobIdOptions = {}) => {
      const trimmed = jobId?.trim();
      if (!trimmed) {
        return;
      }

      if (lastJobIdRef.current === trimmed) {
        return;
      }

      const params = new URLSearchParams(location.search ?? '');
      params.set(paramKey, trimmed);

      lastJobIdRef.current = trimmed;
      navigate(
        {
          pathname: location.pathname,
          search: params.toString(),
        },
        {
          replace: options.replace ?? false,
          state: location.state,
        },
      );
    },
    [location.pathname, location.search, location.state, navigate, paramKey],
  );

  const clearJobId = useCallback(() => {
    if (!lastJobIdRef.current && !currentJobId) {
      return;
    }

    const params = new URLSearchParams(location.search ?? '');
    if (!params.has(paramKey)) {
      // Ensure we still clear the ref/state if caller expects it
      lastJobIdRef.current = null;
      return;
    }

    params.delete(paramKey);
    lastJobIdRef.current = null;

    navigate(
      {
        pathname: location.pathname,
        search: params.toString(),
      },
      {
        replace: false,
        state: location.state,
      },
    );
  }, [currentJobId, location.pathname, location.search, location.state, navigate, paramKey]);

  return {
    jobId: currentJobId,
    setJobId,
    clearJobId,
  };
}

