-- Email clients fetch marketing artwork without a login, including weeks after delivery.
-- Uploads go through the authenticated server route; no client write policy is added.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('email-campaign-images','email-campaign-images',true,4000000,array['image/jpeg'])
on conflict(id) do nothing;
