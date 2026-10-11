# LifeOS Supabase setup

## Already completed
- The frontend uses the Supabase JS v2 CDN and the public project URL/publishable key in `index.html`.
- Authentication uses Supabase email/password.
- The workspace is stored in `public.user_workspaces`, one row per authenticated user.
- Row Level Security policies limit each row to its owner.

## Database
If you already ran the SQL from the chat, do not run a duplicate set of policies. The migration in `supabase/migrations/` is included for version control and future deployments.

## Email confirmation
In Supabase Authentication settings, keep email confirmation enabled if desired. Add your deployed Vercel URL to Authentication > URL Configuration > Redirect URLs, e.g. `https://YOUR-APP.vercel.app/**`.

## Admin
The admin form checks `user.app_metadata.role === "admin"`. Do not set roles from browser code or user-editable metadata. Assign `app_metadata.role=admin` only through a trusted server/admin operation or Supabase dashboard using an authorized admin workflow. Never expose a service-role/secret key in frontend files.

## Important behavior
On the first sign-in to an account with no cloud row, the app uploads the current browser's local workspace. On later sign-ins, the cloud workspace replaces the local copy. Export a backup before testing with important data.
