-- =============================================================
--  Mise à jour n°4 — supprimer une note
--  À coller dans Supabase > SQL Editor > Run
--  AJOUTE seulement une fonction réservée au créateur. Elle ne fait rien
--  toute seule : elle efface UNE note précise, uniquement quand tu cliques
--  sur « Supprimer » dans ton espace créateur. Aucune donnée n'est touchée
--  en lançant ce script. Peut être relancé sans risque.
-- =============================================================

create or replace function public.admin_delete_rating(p_track text, p_voter text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'réservé au créateur'; end if;
  delete from ratings where track_id = p_track and voter = p_voter;
end $$;
grant execute on function public.admin_delete_rating(text, text) to authenticated;
