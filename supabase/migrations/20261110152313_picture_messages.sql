-- Private images are uploaded and signed only by authenticated server routes.
alter table public.messages add column if not exists picture_path text;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('message-pictures','message-pictures',false,300000,array['image/jpeg','image/png','image/gif'])
on conflict (id) do nothing;
