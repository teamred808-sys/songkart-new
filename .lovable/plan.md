

## Fix: Login Page Hanging Issue

### Root Cause
The `useAuth.tsx` hook has a race condition between `onAuthStateChange` and `getSession()`. Both fire on page load and both call `fetchUserData`, which can cause:
- `isLoading` stuck at `true` if `getSession` promise never resolves or the listener fires first
- Duplicate data fetches racing against each other
- The `visibilitychange` handler captures a stale `user` reference from the initial render

### Solution
Restructure the auth initialization following the recommended pattern:

1. **Separate initial load from ongoing changes** -- `onAuthStateChange` handles ongoing session updates (does NOT control `isLoading`); initial `getSession` controls `isLoading` and awaits role fetching before setting it to `false`
2. **Use a mounted flag** to prevent state updates after unmount
3. **Add a safety timeout** so `isLoading` never stays `true` for more than 10 seconds
4. **Fix the visibilitychange handler** to avoid stale closure references

### File Changed

**`src/hooks/useAuth.tsx`** (lines 102-168, the `useEffect` block)

Replace with:

```typescript
useEffect(() => {
  let isMounted = true;

  // Listener for ONGOING auth changes (does NOT control isLoading)
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (event === 'SIGNED_IN' && session) {
        setTimeout(() => migrateSessionStorage(), 0);
      }

      if (session?.user) {
        setTimeout(() => {
          if (isMounted) fetchUserData(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setRole(null);
        setRoles([]);
      }
    }
  );

  // INITIAL load (controls isLoading)
  const initializeAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchUserData(session.user.id);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      if (isMounted) setIsLoading(false);
    }
  };

  initializeAuth();

  // Safety timeout -- never hang longer than 10 seconds
  const safetyTimer = setTimeout(() => {
    if (isMounted) setIsLoading(false);
  }, 10000);

  // Visibility change handler (no stale closure)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!isMounted) return;
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          fetchUserData(session.user.id);
        }
      });
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    isMounted = false;
    clearTimeout(safetyTimer);
    subscription.unsubscribe();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, []);
```

### What changes
- `isLoading` is set to `false` only after the initial session + role fetch completes (or fails)
- `onAuthStateChange` no longer affects `isLoading`, preventing race conditions
- A 10-second safety timeout ensures the page never hangs indefinitely
- `visibilitychange` handler no longer relies on stale `user` state
- `isMounted` flag prevents updates after unmount

### What stays the same
- All existing auth functions (`signIn`, `signUp`, `signOut`, `becomeSeller`, `refreshProfile`)
- Auth page UI (`Auth.tsx`) -- no changes
- `ProtectedRoute` component -- no changes
- All role-based access logic -- unchanged
- Session storage migration logic -- unchanged

