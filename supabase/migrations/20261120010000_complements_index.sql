-- v0.10.1 : index couvrant la clé étrangère composée des prises (conseil Supabase).
create index supplement_logs_supplement_user_idx on public.supplement_logs (supplement_id, user_id);
