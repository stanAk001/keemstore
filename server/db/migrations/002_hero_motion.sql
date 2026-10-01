-- Optional animated "motion scene" rendered in code for a guide's hero
-- (e.g. 'smart-lock-phone'). Video heroes need no column: any image field
-- accepts an .mp4/.webm URL and the site renders it as a looping video.
alter table guides add column hero_motion text;

-- Media library entries can now be videos as well as images.
alter table media add column duration numeric(8, 2);
