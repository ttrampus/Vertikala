-- ============================================================================
-- Vertikala — ponastavitev MFA za člana (izgubljen telefon / obnovitev)
-- ============================================================================
-- Uporabite, ko admin/član izgubi napravo z aplikacijo za avtentikacijo.
-- Klasične "rezervne kode" v Supabase modelu ne delujejo (ne morejo doseči
-- ravni aal2), zato je obnovitev v rokah lastnika/admina: odstranite MFA
-- faktor uporabnika, nato se ta ob naslednjem obisku /admin registrira na novo.
--
-- Zaženite v Supabase SQL Editor. ZAMENJAJTE e-pošto.
-- ============================================================================

-- MOŽNOST A — popolna ponastavitev: odstrani MFA faktor(je) uporabnika.
-- Po tem uporabnik nima MFA; ob obisku /admin dobi nov QR za nastavitev.
delete from auth.mfa_factors
where user_id = (select id from auth.users where lower(email) = 'clan@primer.si');

-- MOŽNOST B — začasna prepustnica (če želite, da uporabnik takoj vstopi BREZ
-- ponovne nastavitve MFA). Kasneje nastavite nazaj na false.
--   update public.profile p set mfa_exempt = true
--   from auth.users u
--   where u.id = p.id and lower(u.email) = 'clan@primer.si';
--
-- Ponovni vklop MFA za tega člana:
--   update public.profile p set mfa_exempt = false
--   from auth.users u
--   where u.id = p.id and lower(u.email) = 'clan@primer.si';

-- ============================================================================
-- Opomba: prepustnice (mfa_exempt) NI mogoče nastaviti iz aplikacije — le
-- tukaj prek SQL (service_role). Tako je napadalec z geslom ne more zlorabiti.
-- ============================================================================
