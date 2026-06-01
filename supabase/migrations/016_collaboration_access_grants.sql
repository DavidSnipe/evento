-- Grant execute on access helper functions (used by app + RLS)
GRANT EXECUTE ON FUNCTION public.user_is_event_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_event_collaborator_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_event_access_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_event_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_edit_with_roles(uuid, text[]) TO authenticated;
