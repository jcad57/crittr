-- ============================================================================
-- Crittr: Co-Care Feature
-- Adds pet_co_carers junction table, notifications table, extends
-- co_carer_invites, creates RLS helper functions, and updates every
-- pet-related RLS policy to grant co-carers appropriate access.
-- ============================================================================

-- ── 1. Extend co_carer_invites ─────────────────────────────────────────────

ALTER TABLE public.co_carer_invites
  ADD COLUMN IF NOT EXISTS invited_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz;

-- ── 2. pet_co_carers junction table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pet_co_carers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  permissions jsonb NOT NULL DEFAULT '{
    "can_log_activities": true,
    "can_edit_pet_profile": false,
    "can_manage_food": false,
    "can_manage_medications": false,
    "can_manage_vaccinations": false,
    "can_manage_vet_visits": false
  }'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pet_id, user_id)
);

ALTER TABLE public.pet_co_carers ENABLE ROW LEVEL SECURITY;

-- ── 3. Notifications table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb DEFAULT '{}',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ── 4. RLS helper functions ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.can_access_pet(p_pet_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pets WHERE id = p_pet_id AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.pet_co_carers WHERE pet_id = p_pet_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_pet_owner(p_pet_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pets WHERE id = p_pet_id AND owner_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.has_pet_permission(p_pet_id uuid, p_permission text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pets WHERE id = p_pet_id AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.pet_co_carers
    WHERE pet_id = p_pet_id
      AND user_id = auth.uid()
      AND (permissions->>p_permission)::boolean = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── 5. Helper: lookup user id by email (for invite flow) ───────────────────

CREATE OR REPLACE FUNCTION public.lookup_user_by_email(lookup_email text)
RETURNS TABLE (id uuid) AS $$
  SELECT au.id FROM auth.users au WHERE lower(au.email) = lower(lookup_email);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── 6. Backfill trigger: link invites when a new user signs up ─────────────

CREATE OR REPLACE FUNCTION public.backfill_co_carer_invites()
RETURNS trigger AS $$
BEGIN
  UPDATE public.co_carer_invites
  SET invited_user_id = NEW.id
  WHERE lower(email) = lower((SELECT email FROM auth.users WHERE id = NEW.id))
    AND status = 'pending'
    AND invited_user_id IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_backfill_invites ON public.profiles;
CREATE TRIGGER on_profile_created_backfill_invites
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.backfill_co_carer_invites();

-- ── 6. RLS: pet_co_carers ──────────────────────────────────────────────────

CREATE POLICY "Pet owners can manage co-carers"
  ON public.pet_co_carers FOR ALL
  TO authenticated
  USING (public.is_pet_owner(pet_id))
  WITH CHECK (public.is_pet_owner(pet_id));

CREATE POLICY "Co-carers can view own rows"
  ON public.pet_co_carers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Invitees can accept and create own co-carer row"
  ON public.pet_co_carers FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.co_carer_invites
      WHERE co_carer_invites.pet_id = pet_co_carers.pet_id
        AND co_carer_invites.invited_user_id = auth.uid()
        AND co_carer_invites.status IN ('pending', 'accepted')
    )
  );

CREATE POLICY "Co-carers can leave (delete own row)"
  ON public.pet_co_carers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ── 7. RLS: notifications ──────────────────────────────────────────────────

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ── 8. RLS: co_carer_invites (extend for invitees) ────────────────────────

DROP POLICY IF EXISTS "Users can view own invites" ON public.co_carer_invites;
CREATE POLICY "Users can view relevant invites"
  ON public.co_carer_invites FOR SELECT
  TO authenticated
  USING (auth.uid() = invited_by OR auth.uid() = invited_user_id);

DROP POLICY IF EXISTS "Users can insert own invites" ON public.co_carer_invites;
CREATE POLICY "Users can insert own invites"
  ON public.co_carer_invites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "Invitees can update invite status"
  ON public.co_carer_invites FOR UPDATE
  TO authenticated
  USING (auth.uid() = invited_user_id);

CREATE POLICY "Inviters can delete own invites"
  ON public.co_carer_invites FOR DELETE
  TO authenticated
  USING (auth.uid() = invited_by);

-- ── 9. RLS: pets — co-carers can SELECT shared pets ────────────────────────

DROP POLICY IF EXISTS "Users can view own pets" ON public.pets;
CREATE POLICY "Users can view accessible pets"
  ON public.pets FOR SELECT
  TO authenticated
  USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.pet_co_carers
      WHERE pet_co_carers.pet_id = pets.id
        AND pet_co_carers.user_id = auth.uid()
    )
  );

-- Owner-only write policies stay unchanged (already exist from earlier migrations)
-- co-carers cannot INSERT/UPDATE/DELETE the pets row itself;
-- pet profile edits go through child tables or dedicated service functions.

-- ── 10. RLS: pet_foods — co-carer aware ───────────────────────────────────

DROP POLICY IF EXISTS "Users can view own pet foods" ON public.pet_foods;
CREATE POLICY "Users can view accessible pet foods"
  ON public.pet_foods FOR SELECT
  TO authenticated
  USING (public.can_access_pet(pet_id));

DROP POLICY IF EXISTS "Users can insert own pet foods" ON public.pet_foods;
CREATE POLICY "Users can insert pet foods with permission"
  ON public.pet_foods FOR INSERT
  TO authenticated
  WITH CHECK (public.has_pet_permission(pet_id, 'can_manage_food'));

DROP POLICY IF EXISTS "Users can update own pet foods" ON public.pet_foods;
CREATE POLICY "Users can update pet foods with permission"
  ON public.pet_foods FOR UPDATE
  TO authenticated
  USING (public.has_pet_permission(pet_id, 'can_manage_food'));

DROP POLICY IF EXISTS "Users can delete own pet foods" ON public.pet_foods;
CREATE POLICY "Users can delete pet foods with permission"
  ON public.pet_foods FOR DELETE
  TO authenticated
  USING (public.has_pet_permission(pet_id, 'can_manage_food'));

-- ── 11. RLS: pet_medications — co-carer aware ────────────────────────────

DROP POLICY IF EXISTS "Users can view own pet medications" ON public.pet_medications;
CREATE POLICY "Users can view accessible pet medications"
  ON public.pet_medications FOR SELECT
  TO authenticated
  USING (public.can_access_pet(pet_id));

DROP POLICY IF EXISTS "Users can insert own pet medications" ON public.pet_medications;
CREATE POLICY "Users can insert pet medications with permission"
  ON public.pet_medications FOR INSERT
  TO authenticated
  WITH CHECK (public.has_pet_permission(pet_id, 'can_manage_medications'));

DROP POLICY IF EXISTS "Users can update own pet medications" ON public.pet_medications;
CREATE POLICY "Users can update pet medications with permission"
  ON public.pet_medications FOR UPDATE
  TO authenticated
  USING (public.has_pet_permission(pet_id, 'can_manage_medications'));

DROP POLICY IF EXISTS "Users can delete own pet medications" ON public.pet_medications;
CREATE POLICY "Users can delete pet medications with permission"
  ON public.pet_medications FOR DELETE
  TO authenticated
  USING (public.has_pet_permission(pet_id, 'can_manage_medications'));

-- ── 12. RLS: pet_vaccinations — co-carer aware ──────────────────────────

DROP POLICY IF EXISTS "Users can view own pet vaccinations" ON public.pet_vaccinations;
CREATE POLICY "Users can view accessible pet vaccinations"
  ON public.pet_vaccinations FOR SELECT
  TO authenticated
  USING (public.can_access_pet(pet_id));

DROP POLICY IF EXISTS "Users can insert own pet vaccinations" ON public.pet_vaccinations;
CREATE POLICY "Users can insert pet vaccinations with permission"
  ON public.pet_vaccinations FOR INSERT
  TO authenticated
  WITH CHECK (public.has_pet_permission(pet_id, 'can_manage_vaccinations'));

DROP POLICY IF EXISTS "Users can update own pet vaccinations" ON public.pet_vaccinations;
CREATE POLICY "Users can update pet vaccinations with permission"
  ON public.pet_vaccinations FOR UPDATE
  TO authenticated
  USING (public.has_pet_permission(pet_id, 'can_manage_vaccinations'));

DROP POLICY IF EXISTS "Users can delete own pet vaccinations" ON public.pet_vaccinations;
CREATE POLICY "Users can delete pet vaccinations with permission"
  ON public.pet_vaccinations FOR DELETE
  TO authenticated
  USING (public.has_pet_permission(pet_id, 'can_manage_vaccinations'));

-- ── 13. RLS: pet_vet_visits — co-carer aware ────────────────────────────

DROP POLICY IF EXISTS "Users can view own pet vet visits" ON public.pet_vet_visits;
CREATE POLICY "Users can view accessible pet vet visits"
  ON public.pet_vet_visits FOR SELECT
  TO authenticated
  USING (public.can_access_pet(pet_id));

DROP POLICY IF EXISTS "Users can insert own pet vet visits" ON public.pet_vet_visits;
CREATE POLICY "Users can insert pet vet visits with permission"
  ON public.pet_vet_visits FOR INSERT
  TO authenticated
  WITH CHECK (public.has_pet_permission(pet_id, 'can_manage_vet_visits'));

DROP POLICY IF EXISTS "Users can update own pet vet visits" ON public.pet_vet_visits;
CREATE POLICY "Users can update pet vet visits with permission"
  ON public.pet_vet_visits FOR UPDATE
  TO authenticated
  USING (public.has_pet_permission(pet_id, 'can_manage_vet_visits'));

DROP POLICY IF EXISTS "Users can delete own pet vet visits" ON public.pet_vet_visits;
CREATE POLICY "Users can delete pet vet visits with permission"
  ON public.pet_vet_visits FOR DELETE
  TO authenticated
  USING (public.has_pet_permission(pet_id, 'can_manage_vet_visits'));

-- ── 14. RLS: pet_weight_entries — co-carer aware ────────────────────────

DROP POLICY IF EXISTS "Users can view own pet weight entries" ON public.pet_weight_entries;
CREATE POLICY "Users can view accessible pet weight entries"
  ON public.pet_weight_entries FOR SELECT
  TO authenticated
  USING (public.can_access_pet(pet_id));

DROP POLICY IF EXISTS "Users can insert own pet weight entries" ON public.pet_weight_entries;
CREATE POLICY "Users can insert pet weight entries with access"
  ON public.pet_weight_entries FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_pet(pet_id));

DROP POLICY IF EXISTS "Users can update own pet weight entries" ON public.pet_weight_entries;
CREATE POLICY "Users can update pet weight entries with access"
  ON public.pet_weight_entries FOR UPDATE
  TO authenticated
  USING (public.can_access_pet(pet_id));

DROP POLICY IF EXISTS "Users can delete own pet weight entries" ON public.pet_weight_entries;
CREATE POLICY "Users can delete pet weight entries with access"
  ON public.pet_weight_entries FOR DELETE
  TO authenticated
  USING (public.can_access_pet(pet_id));

-- ── 15. RLS: pet_exercises — co-carer aware ─────────────────────────────

DROP POLICY IF EXISTS "Users can view own pet exercises" ON public.pet_exercises;
CREATE POLICY "Users can view accessible pet exercises"
  ON public.pet_exercises FOR SELECT
  TO authenticated
  USING (public.can_access_pet(pet_id));

DROP POLICY IF EXISTS "Users can insert own pet exercises" ON public.pet_exercises;
CREATE POLICY "Users can insert pet exercises with permission"
  ON public.pet_exercises FOR INSERT
  TO authenticated
  WITH CHECK (public.has_pet_permission(pet_id, 'can_edit_pet_profile'));

-- ── 16. RLS: pet_activities — co-carer aware ────────────────────────────

DROP POLICY IF EXISTS "Users can view own pet activities" ON public.pet_activities;
CREATE POLICY "Users can view accessible pet activities"
  ON public.pet_activities FOR SELECT
  TO authenticated
  USING (public.can_access_pet(pet_id));

DROP POLICY IF EXISTS "Users can insert own pet activities" ON public.pet_activities;
CREATE POLICY "Users can insert pet activities with permission"
  ON public.pet_activities FOR INSERT
  TO authenticated
  WITH CHECK (public.has_pet_permission(pet_id, 'can_log_activities'));

DROP POLICY IF EXISTS "Users can update own pet activities" ON public.pet_activities;
CREATE POLICY "Users can update pet activities"
  ON public.pet_activities FOR UPDATE
  TO authenticated
  USING (
    public.is_pet_owner(pet_id)
    OR (logged_by = auth.uid() AND public.can_access_pet(pet_id))
  );

DROP POLICY IF EXISTS "Users can delete own pet activities" ON public.pet_activities;
CREATE POLICY "Users can delete pet activities"
  ON public.pet_activities FOR DELETE
  TO authenticated
  USING (
    public.is_pet_owner(pet_id)
    OR (logged_by = auth.uid() AND public.can_access_pet(pet_id))
  );

-- ── 17. RLS: profiles — allow co-carers to read each other's profiles ──

CREATE POLICY "Users can view co-carer profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.pet_co_carers pc1
      JOIN public.pet_co_carers pc2 ON pc1.pet_id = pc2.pet_id
      WHERE pc1.user_id = auth.uid() AND pc2.user_id = profiles.id
    )
    OR EXISTS (
      SELECT 1 FROM public.pets p
      JOIN public.pet_co_carers pc ON pc.pet_id = p.id
      WHERE (p.owner_id = auth.uid() AND pc.user_id = profiles.id)
         OR (pc.user_id = auth.uid() AND p.owner_id = profiles.id)
    )
  );
