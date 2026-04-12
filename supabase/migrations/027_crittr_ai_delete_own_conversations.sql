-- Allow users to delete their own CrittrAI threads (messages cascade).

DROP POLICY IF EXISTS crittr_ai_conversations_delete_own ON public.crittr_ai_conversations;

CREATE POLICY crittr_ai_conversations_delete_own
  ON public.crittr_ai_conversations
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));
