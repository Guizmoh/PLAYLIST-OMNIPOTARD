-- =============================================================
--  Mise à jour n°3 — « qui a mis quelle note »
--  À coller dans Supabase > SQL Editor > Run
--  AJOUTE une colonne « author » (vide pour les notes existantes) et une
--  version de rate_track qui enregistre le nom. Ne supprime AUCUNE donnée,
--  les notes déjà données sont conservées telles quelles.
--  Peut être relancé sans risque.
-- =============================================================

alter table public.ratings add column if not exists author text check (char_length(author) <= 40);

create or replace function public.rate_track(p_track text, p_stars int, p_voter text, p_author text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_stars < 1 or p_stars > 5 then raise exception 'note invalide'; end if;
  insert into ratings (track_id, voter, stars, author)
  values (p_track, left(p_voter, 64), p_stars, left(nullif(trim(p_author), ''), 40))
  on conflict (track_id, voter) do update
    set stars = excluded.stars,
        author = coalesce(excluded.author, ratings.author),
        updated_at = now();
end $$;
grant execute on function public.rate_track(text, int, text, text) to anon, authenticated;
