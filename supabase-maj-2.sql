-- =============================================================
--  Mise à jour n°2 — à coller dans Supabase > SQL Editor > Run
--  N'AJOUTE que deux fonctions réservées au créateur.
--  Ne modifie et ne supprime AUCUNE table ni AUCUNE donnée existante.
--  Peut être relancé sans risque.
-- =============================================================

-- Supprimer UN classement précis (doublon…), seulement par le créateur
create or replace function public.admin_delete_ranking(p_voter text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'réservé au créateur'; end if;
  delete from rankings where voter = p_voter;
end $$;
grant execute on function public.admin_delete_ranking(text) to authenticated;

-- Lire toutes les notes (pour la sauvegarde), seulement par le créateur
create or replace function public.admin_ratings() returns setof public.ratings
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'réservé au créateur'; end if;
  return query select * from ratings order by updated_at desc;
end $$;
grant execute on function public.admin_ratings() to authenticated;
