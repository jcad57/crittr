-- CrittrAI: one conversation thread per user (multiple rows allowed; app uses latest by updated_at).
-- Messages are written only via Edge Function (service role). Users read via RLS.

-- ── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.crittr_ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crittr_ai_conversations_user_updated
  ON public.crittr_ai_conversations (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.crittr_ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.crittr_ai_conversations (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL CHECK (char_length(content) <= 16000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crittr_ai_messages_conversation_created
  ON public.crittr_ai_messages (conversation_id, created_at ASC);

COMMENT ON TABLE public.crittr_ai_conversations IS
  'CrittrAI chat thread; rows owned by auth.users.';

COMMENT ON TABLE public.crittr_ai_messages IS
  'Chat turns for CrittrAI; inserts from Edge Function only.';

-- Bump parent conversation when a message is inserted (ordering + “latest thread”).
CREATE OR REPLACE FUNCTION public.crittr_ai_touch_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.crittr_ai_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crittr_ai_message_touch_conv ON public.crittr_ai_messages;
CREATE TRIGGER trg_crittr_ai_message_touch_conv
  AFTER INSERT ON public.crittr_ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.crittr_ai_touch_conversation_on_message();

-- ── RLS: read own data only; no direct writes from clients ───────────────────

ALTER TABLE public.crittr_ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crittr_ai_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crittr_ai_conversations_select_own ON public.crittr_ai_conversations;
CREATE POLICY crittr_ai_conversations_select_own
  ON public.crittr_ai_conversations
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS crittr_ai_messages_select_own ON public.crittr_ai_messages;
CREATE POLICY crittr_ai_messages_select_own
  ON public.crittr_ai_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.crittr_ai_conversations c
      WHERE c.id = conversation_id
        AND c.user_id = (SELECT auth.uid())
    )
  );
