-- =============================================================
--  Playlist — base de données Supabase
--  À coller dans Supabase > SQL Editor > New query, puis "Run".
--  ⚠️ Remplace ton-email@exemple.com (tout en bas) par TON e-mail.
-- =============================================================

-- ---------- Commentaires ----------
create table if not exists public.comments (
  id                  uuid primary key default gen_random_uuid(),
  track_id            text not null check (char_length(track_id) <= 200),
  author              text check (char_length(author) <= 40),
  body                text not null check (char_length(body) between 1 and 2000),
  timecode            real check (timecode >= 0),            -- public : null = commentaire général
  written_at_position real check (written_at_position >= 0), -- privé : position de l'écoute quand la personne a écrit
  created_at          timestamptz not null default now()
);
create index if not exists comments_track_idx on public.comments (track_id, created_at desc);

-- ---------- Notes ----------
create table if not exists public.ratings (
  track_id   text not null,
  voter      text not null,                       -- identifiant anonyme stocké dans le navigateur
  stars      smallint not null check (stars between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (track_id, voter)
);

-- ---------- Créateur(s) du site ----------
create table if not exists public.admins (email text primary key);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

-- ---------- Sécurité ----------
alter table public.comments enable row level security;
alter table public.ratings  enable row level security;
alter table public.admins   enable row level security;   -- aucune policy = illisible depuis le site

drop policy if exists "lecture publique"   on public.comments;
drop policy if exists "ecriture publique"  on public.comments;
drop policy if exists "suppression admin"  on public.comments;
drop policy if exists "lecture admin" on public.comments;
create policy "lecture admin"     on public.comments for select using (public.is_admin());
create policy "ecriture publique" on public.comments for insert with check (true);
create policy "suppression admin" on public.comments for delete using (public.is_admin());

-- Les visiteurs ne peuvent PAS lire les commentaires (ils sont privés, réservés au créateur
-- via admin_comments()). Ils peuvent seulement en envoyer.
revoke all on public.comments from anon, authenticated;
grant insert (track_id, author, body, timecode, written_at_position) on public.comments to anon, authenticated;
grant delete on public.comments to authenticated;

revoke all on public.ratings from anon, authenticated;   -- les notes passent par rate_track()

-- ---------- Fonctions appelées par le site ----------
-- Noter (ou changer sa note)
create or replace function public.rate_track(p_track text, p_stars int, p_voter text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_stars < 1 or p_stars > 5 then raise exception 'note invalide'; end if;
  insert into ratings (track_id, voter, stars) values (p_track, left(p_voter, 64), p_stars)
  on conflict (track_id, voter) do update set stars = excluded.stars, updated_at = now();
end $$;
grant execute on function public.rate_track(text, int, text) to anon, authenticated;

-- Commentaires complets (avec written_at_position) — réservé au créateur
create or replace function public.admin_comments(p_track text default null)
returns setof public.comments
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'réservé au créateur'; end if;
  return query select * from comments
    where p_track is null or track_id = p_track
    order by created_at desc;
end $$;
grant execute on function public.admin_comments(text) to authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- Statistiques publiques par morceau
create or replace view public.track_stats as
  select t.track_id,
         round(avg(r.stars)::numeric, 2) as rating_avg,
         count(distinct r.voter)         as rating_count,
         (select count(*) from comments c where c.track_id = t.track_id) as comment_count
  from (select track_id from comments union select track_id from ratings) t
  left join ratings r on r.track_id = t.track_id
  group by t.track_id;
grant select on public.track_stats to anon, authenticated;

-- ---------- Classements des morceaux préférés ----------
create table if not exists public.rankings (
  voter      text primary key,                    -- identifiant anonyme du navigateur
  author     text check (char_length(author) <= 40),
  track_ids  text[] not null check (coalesce(array_length(track_ids, 1), 0) between 1 and 500),
  updated_at timestamptz not null default now()
);
alter table public.rankings enable row level security;
revoke all on public.rankings from anon, authenticated;   -- illisible par les visiteurs

create or replace function public.save_ranking(p_voter text, p_author text, p_tracks text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into rankings (voter, author, track_ids) values (left(p_voter, 64), left(nullif(trim(p_author), ''), 40), p_tracks)
  on conflict (voter) do update set author = excluded.author, track_ids = excluded.track_ids, updated_at = now();
end $$;
grant execute on function public.save_ranking(text, text, text[]) to anon, authenticated;

create or replace function public.admin_rankings() returns setof public.rankings
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'réservé au créateur'; end if;
  return query select * from rankings order by updated_at desc;
end $$;
grant execute on function public.admin_rankings() to authenticated;

-- ---------- ⚠️ TON E-MAIL ICI ----------
insert into public.admins (email) values ('ton-email@exemple.com') on conflict do nothing;
