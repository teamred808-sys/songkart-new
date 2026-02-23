

## Fix: Dashboard Link for Admin Users

### Problem
In `src/components/layout/Navbar.tsx`, the `getDashboardLink()` function (line 31-35) returns `/admin` when the user's role is `admin`. Since there's already a separate "Admin Panel" link pointing to `/admin`, the "Dashboard" link becomes redundant.

### Fix
**File: `src/components/layout/Navbar.tsx` (line 32)**

Change:
```typescript
if (role === 'admin') return '/admin';
```
To:
```typescript
if (role === 'admin') return '/seller';
```

This makes the "Dashboard" link take admin users to their seller dashboard, while "Admin Panel" continues to provide access to admin functionality. One line change, no other files affected.

