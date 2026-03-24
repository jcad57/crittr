-- ============================================================================
-- Crittr: Reference data for pet types, breeds, and allergies
-- Run this AFTER 001_initial_schema.sql
-- ============================================================================

-- Enable trigram extension for fuzzy text search
create extension if not exists pg_trgm;

-- ── Pet Types ────────────────────────────────────────────────────────────────
create table public.pet_types (
  id text primary key,
  name text not null,
  icon_name text not null
);

alter table public.pet_types enable row level security;
create policy "Anyone can read pet types" on public.pet_types for select using (true);

insert into public.pet_types (id, name, icon_name) values
  ('dog',     'Dog',     'dog'),
  ('cat',     'Cat',     'cat'),
  ('fish',    'Fish',    'fish'),
  ('bird',    'Bird',    'bird'),
  ('reptile', 'Reptile', 'snake'),
  ('other',   'Other',   'paw');

-- ── Breeds / Species ─────────────────────────────────────────────────────────
create table public.breeds (
  id uuid default gen_random_uuid() primary key,
  pet_type text not null references public.pet_types(id),
  name text not null
);

create index breeds_type_idx on public.breeds (pet_type);
create index breeds_search_idx on public.breeds using gin (name gin_trgm_ops);

alter table public.breeds enable row level security;
create policy "Anyone can read breeds" on public.breeds for select using (true);

-- Dog breeds
insert into public.breeds (pet_type, name) values
  ('dog', 'Golden Retriever'),
  ('dog', 'Labrador Retriever'),
  ('dog', 'German Shepherd'),
  ('dog', 'French Bulldog'),
  ('dog', 'Bulldog'),
  ('dog', 'Poodle'),
  ('dog', 'Beagle'),
  ('dog', 'Rottweiler'),
  ('dog', 'Dachshund'),
  ('dog', 'German Shorthaired Pointer'),
  ('dog', 'Pembroke Welsh Corgi'),
  ('dog', 'Australian Shepherd'),
  ('dog', 'Yorkshire Terrier'),
  ('dog', 'Cavalier King Charles Spaniel'),
  ('dog', 'Doberman Pinscher'),
  ('dog', 'Boxer'),
  ('dog', 'Great Dane'),
  ('dog', 'Miniature Schnauzer'),
  ('dog', 'Siberian Husky'),
  ('dog', 'Bernese Mountain Dog'),
  ('dog', 'Shih Tzu'),
  ('dog', 'Boston Terrier'),
  ('dog', 'Pomeranian'),
  ('dog', 'Havanese'),
  ('dog', 'Shetland Sheepdog'),
  ('dog', 'Border Collie'),
  ('dog', 'Great Pyrenees'),
  ('dog', 'Cocker Spaniel'),
  ('dog', 'Irish Setter'),
  ('dog', 'Chihuahua'),
  ('dog', 'Maltese'),
  ('dog', 'Pit Bull Terrier'),
  ('dog', 'Mixed Breed'),
  ('dog', 'Other');

-- Cat breeds
insert into public.breeds (pet_type, name) values
  ('cat', 'Domestic Shorthair'),
  ('cat', 'Domestic Longhair'),
  ('cat', 'Persian'),
  ('cat', 'Maine Coon'),
  ('cat', 'Ragdoll'),
  ('cat', 'British Shorthair'),
  ('cat', 'Abyssinian'),
  ('cat', 'Bengal'),
  ('cat', 'Siamese'),
  ('cat', 'Sphynx'),
  ('cat', 'Scottish Fold'),
  ('cat', 'Russian Blue'),
  ('cat', 'Burmese'),
  ('cat', 'Norwegian Forest Cat'),
  ('cat', 'Birman'),
  ('cat', 'Oriental Shorthair'),
  ('cat', 'Devon Rex'),
  ('cat', 'Exotic Shorthair'),
  ('cat', 'Tonkinese'),
  ('cat', 'Savannah'),
  ('cat', 'Mixed Breed'),
  ('cat', 'Other');

-- Fish species
insert into public.breeds (pet_type, name) values
  ('fish', 'Betta'),
  ('fish', 'Goldfish'),
  ('fish', 'Guppy'),
  ('fish', 'Neon Tetra'),
  ('fish', 'Angelfish'),
  ('fish', 'Oscar'),
  ('fish', 'Clownfish'),
  ('fish', 'Discus'),
  ('fish', 'Molly'),
  ('fish', 'Platy'),
  ('fish', 'Corydoras'),
  ('fish', 'Cichlid'),
  ('fish', 'Koi'),
  ('fish', 'Other');

-- Bird species
insert into public.breeds (pet_type, name) values
  ('bird', 'Parakeet / Budgie'),
  ('bird', 'Cockatiel'),
  ('bird', 'Cockatoo'),
  ('bird', 'African Grey Parrot'),
  ('bird', 'Macaw'),
  ('bird', 'Conure'),
  ('bird', 'Lovebird'),
  ('bird', 'Canary'),
  ('bird', 'Finch'),
  ('bird', 'Amazon Parrot'),
  ('bird', 'Dove'),
  ('bird', 'Parrotlet'),
  ('bird', 'Other');

-- Reptile species
insert into public.breeds (pet_type, name) values
  ('reptile', 'Ball Python'),
  ('reptile', 'Corn Snake'),
  ('reptile', 'Leopard Gecko'),
  ('reptile', 'Bearded Dragon'),
  ('reptile', 'Crested Gecko'),
  ('reptile', 'Blue Tongue Skink'),
  ('reptile', 'Red-Eared Slider'),
  ('reptile', 'Chameleon'),
  ('reptile', 'King Snake'),
  ('reptile', 'Boa Constrictor'),
  ('reptile', 'Iguana'),
  ('reptile', 'Tortoise'),
  ('reptile', 'Tegu'),
  ('reptile', 'Other');

-- Other
insert into public.breeds (pet_type, name) values
  ('other', 'Hamster'),
  ('other', 'Guinea Pig'),
  ('other', 'Rabbit'),
  ('other', 'Ferret'),
  ('other', 'Hedgehog'),
  ('other', 'Chinchilla'),
  ('other', 'Rat'),
  ('other', 'Mouse'),
  ('other', 'Sugar Glider'),
  ('other', 'Hermit Crab'),
  ('other', 'Other');

-- ── Common Allergies ─────────────────────────────────────────────────────────
create table public.common_allergies (
  id uuid default gen_random_uuid() primary key,
  pet_type text not null references public.pet_types(id),
  name text not null
);

create index allergies_type_idx on public.common_allergies (pet_type);

alter table public.common_allergies enable row level security;
create policy "Anyone can read allergies" on public.common_allergies for select using (true);

-- Dog allergies
insert into public.common_allergies (pet_type, name) values
  ('dog', 'Chicken'),
  ('dog', 'Beef'),
  ('dog', 'Dairy'),
  ('dog', 'Wheat'),
  ('dog', 'Soy'),
  ('dog', 'Corn'),
  ('dog', 'Egg'),
  ('dog', 'Lamb'),
  ('dog', 'Pork'),
  ('dog', 'Fish'),
  ('dog', 'Flea Saliva'),
  ('dog', 'Grass'),
  ('dog', 'Dust Mites'),
  ('dog', 'Mold'),
  ('dog', 'Pollen');

-- Cat allergies
insert into public.common_allergies (pet_type, name) values
  ('cat', 'Chicken'),
  ('cat', 'Beef'),
  ('cat', 'Fish'),
  ('cat', 'Dairy'),
  ('cat', 'Wheat'),
  ('cat', 'Corn'),
  ('cat', 'Soy'),
  ('cat', 'Egg'),
  ('cat', 'Flea Saliva'),
  ('cat', 'Dust Mites'),
  ('cat', 'Pollen'),
  ('cat', 'Mold'),
  ('cat', 'Perfume / Fragrance'),
  ('cat', 'Cleaning Products');

-- Fish allergies (environmental)
insert into public.common_allergies (pet_type, name) values
  ('fish', 'Chlorine'),
  ('fish', 'Ammonia'),
  ('fish', 'Copper'),
  ('fish', 'Nitrite');

-- Bird allergies
insert into public.common_allergies (pet_type, name) values
  ('bird', 'Peanuts'),
  ('bird', 'Avocado'),
  ('bird', 'Chocolate'),
  ('bird', 'Tobacco Smoke'),
  ('bird', 'Aerosol Sprays'),
  ('bird', 'Teflon Fumes'),
  ('bird', 'Scented Candles');

-- Reptile allergies
insert into public.common_allergies (pet_type, name) values
  ('reptile', 'Cedar Shavings'),
  ('reptile', 'Pine Shavings'),
  ('reptile', 'Mold'),
  ('reptile', 'Cleaning Chemicals'),
  ('reptile', 'Substrate Dust');

-- Other pet allergies
insert into public.common_allergies (pet_type, name) values
  ('other', 'Cedar Shavings'),
  ('other', 'Pine Shavings'),
  ('other', 'Dairy'),
  ('other', 'Citrus'),
  ('other', 'Dust'),
  ('other', 'Mold');

-- ── Alter pets table ─────────────────────────────────────────────────────────
alter table public.pets
  add column if not exists pet_type text references public.pet_types(id),
  add column if not exists exercises_per_day integer;
