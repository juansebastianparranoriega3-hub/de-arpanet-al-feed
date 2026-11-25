-- ==========================================================================
-- De ARPANET al feed · RED-1011-N-25 — backend en Supabase
-- --------------------------------------------------------------------------
-- Vive en el proyecto "sophialap" junto a SophiaLap, sin tocar nada de ella:
-- todo lo de este RED lleva el prefijo red_ (tablas y funciones).
--
-- Modelo de seguridad (igual que SophiaLap):
--   * Las tablas tienen RLS activado y NINGUNA política: anon y authenticated
--     no pueden leer ni escribir directamente (además se revocan sus permisos).
--   * Todo pasa por funciones RPC SECURITY DEFINER con search_path fijo, que
--     validan los datos (estudiante) o el token de sesión (docente).
--   * La docente entra con el mismo código de acceso de siempre. El servidor
--     calcula la misma huella (hash FNV-1a iterado) que usaba antes app.js y la
--     compara con la huella guardada; el código en claro no se guarda en ningún
--     lado. La sesión es un token aleatorio de 32 bytes que expira en 8 h; en
--     la base solo se guarda su SHA-256.
--
-- Migraciones aplicadas: red_schema, red_demo_data (datos ficticios, al final).
-- ==========================================================================

-- ---------- 1. TABLAS -------------------------------------------------------

create table if not exists public.red_results (
  attempt_id    uuid primary key,                 -- generado en el navegador (evita duplicados)
  student_name  text not null check (char_length(student_name) between 3 and 80),
  grade         text not null check (grade in ('10.º', '11.º')),
  level         text not null check (level in (
                  'Sobresaliente', 'Sobresaliente con apoyo puntual', 'Logrado alto',
                  'Logrado', 'Básico / en proceso', 'Inicial — requiere refuerzo')),
  score         numeric(2,1) not null check (score between 1.0 and 5.0),
  criteria      jsonb not null,                   -- {comprension, analisis, aplicacion, argumentacion} 1.0–5.0
  counts        jsonb not null,                   -- {pregunta, transformacion, aplicacion, argumentacion, omitida}
  answers       jsonb not null default '[]'::jsonb, -- [{parte, pregunta, respuesta}] para Tutor Feed
  completed_at  timestamptz not null,
  created_at    timestamptz not null default now(),
  is_demo       boolean not null default false    -- true = estudiante ficticio de demostración
);

create index if not exists red_results_completed_at_idx on public.red_results (completed_at desc);

-- Configuración del panel docente (una sola fila).
create table if not exists public.red_settings (
  id                 smallint primary key default 1 check (id = 1),
  teacher_code_hash  text not null                -- huella del código docente (la misma que tenía app.js)
);

create table if not exists public.red_teacher_sessions (
  token_hash  text primary key,                   -- SHA-256 del token; el token en claro solo lo tiene el navegador
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

alter table public.red_results          enable row level security;
alter table public.red_settings         enable row level security;
alter table public.red_teacher_sessions enable row level security;

revoke all on public.red_results, public.red_settings, public.red_teacher_sessions from public, anon, authenticated;

-- Huella del código docente que ya usaba el RED (DOCENTE_CLAVE_HASH en app.js).
insert into public.red_settings (id, teacher_code_hash)
values (1, '1d3393b986604b69')
on conflict (id) do nothing;

-- ---------- 2. FUNCIONES AUXILIARES (privadas) -----------------------------

-- SHA-256 en hexadecimal (para guardar tokens de sesión).
create or replace function public.red_sha(p text)
returns text language sql immutable set search_path = ''
as $$ select encode(extensions.digest(coalesce(p, ''), 'sha256'), 'hex'); $$;

-- FNV-1a de 32 bits idéntico al de app.js (charCodeAt = unidades UTF-16,
-- Math.imul >>> 0 = producto módulo 2^32, mezcla final incluida).
create or replace function public.red_fnv1a(p_text text, p_seed bigint default 2166136261)
returns bigint language plpgsql immutable set search_path = ''
as $$
declare
  h  bigint := p_seed & 4294967295;
  cp integer;
  i  integer;
begin
  for i in 1 .. char_length(p_text) loop
    cp := ascii(substr(p_text, i, 1));
    if cp > 65535 then
      -- Fuera del plano básico: JS recorre los dos sustitutos UTF-16.
      h := ((h # (55296 + ((cp - 65536) >> 10))) * 16777619) & 4294967295;
      h := ((h # (56320 + ((cp - 65536) & 1023))) * 16777619) & 4294967295;
    else
      h := ((h # cp) * 16777619) & 4294967295;
    end if;
  end loop;
  h := h # (h >> 16);
  h := (h * 73244475) & 4294967295;   -- 0x45d9f3b
  h := h # (h >> 16);
  return h;
end $$;

-- Huella del código docente: misma receta que hashClaveDocente() de app.js.
create or replace function public.red_teacher_code_hash(p_code text)
returns text language plpgsql immutable set search_path = ''
as $$
declare
  t text := upper(regexp_replace(coalesce(p_code, ''), '^\s+|\s+$', '', 'g'));
  a bigint;
  b bigint;
  i integer;
begin
  a := public.red_fnv1a('red1011n25|docente|' || t, 2166136261);   -- 0x811c9dc5
  b := public.red_fnv1a(t || '|panel|n25red', 2538058380);         -- 0x9747b28c
  for i in 1 .. 2000 loop
    a := public.red_fnv1a(to_hex(a) || ':' || to_hex(b) || ':' || t, a # 1540483477);  -- 0x5bd1e995
    b := public.red_fnv1a(to_hex(b) || ';' || to_hex(a) || ';' || t, b # 668265263);   -- 0x27d4eb2f
  end loop;
  return lpad(to_hex(a), 8, '0') || lpad(to_hex(b), 8, '0');
end $$;

-- Exige un token de sesión docente vigente.
create or replace function public.red_require_teacher(p_token text)
returns void language plpgsql stable set search_path = ''
as $$
begin
  if p_token is null or char_length(p_token) <> 64 or not exists (
       select 1 from public.red_teacher_sessions
       where token_hash = public.red_sha(p_token) and expires_at > now()) then
    raise exception 'Acceso docente requerido.' using errcode = '28000';
  end if;
end $$;

-- ---------- 3. RPC DEL ESTUDIANTE -------------------------------------------

-- Guarda el resultado del PRIMER recorrido completo. Idempotente por attempt_id:
-- si ya existe, no lo sobrescribe y responde duplicate = true.
create or replace function public.red_submit_result(
  p_attempt_id   uuid,
  p_name         text,
  p_grade        text,
  p_level        text,
  p_score        numeric,
  p_criteria     jsonb,
  p_counts       jsonb,
  p_answers      jsonb,
  p_completed_at timestamptz
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_name     text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_keys     text[] := array['comprension', 'analisis', 'aplicacion', 'argumentacion'];
  v_key      text;
  v_val      numeric;
  v_sum      numeric := 0;
  v_answers  jsonb := '[]'::jsonb;
  v_item     jsonb;
  v_when     timestamptz := coalesce(p_completed_at, now());
  v_inserted integer;
begin
  if p_attempt_id is null then
    raise exception 'Falta el identificador del intento.' using errcode = '22023';
  end if;
  if char_length(v_name) < 3 or char_length(v_name) > 80 then
    raise exception 'Nombre no válido.' using errcode = '22023';
  end if;
  if p_grade is null or p_grade not in ('10.º', '11.º') then
    raise exception 'Grado no válido.' using errcode = '22023';
  end if;
  if p_score is null or p_score < 1.0 or p_score > 5.0 then
    raise exception 'Nota fuera de rango.' using errcode = '22023';
  end if;

  -- Desglose por criterio: los cuatro, numéricos y entre 1.0 y 5.0.
  if jsonb_typeof(p_criteria) is distinct from 'object' then
    raise exception 'Desglose no válido.' using errcode = '22023';
  end if;
  foreach v_key in array v_keys loop
    if jsonb_typeof(p_criteria -> v_key) is distinct from 'number' then
      raise exception 'Falta el criterio %.', v_key using errcode = '22023';
    end if;
    v_val := (p_criteria ->> v_key)::numeric;
    if v_val < 1.0 or v_val > 5.0 then
      raise exception 'Criterio % fuera de rango.', v_key using errcode = '22023';
    end if;
    v_sum := v_sum + v_val;
  end loop;
  -- La nota debe ser el promedio de los cuatro criterios (redondeado a 0.1).
  if abs(p_score - round(v_sum / 4, 1)) > 0.051 then
    raise exception 'La nota no coincide con el desglose.' using errcode = '22023';
  end if;
  -- El nivel sale de la nota con las mismas franjas que usa app.js.
  if p_level is distinct from (case
       when p_score >= 5.0 then 'Sobresaliente'
       when p_score >= 4.5 then 'Sobresaliente con apoyo puntual'
       when p_score >= 4.0 then 'Logrado alto'
       when p_score >= 3.5 then 'Logrado'
       when p_score >= 3.0 then 'Básico / en proceso'
       else 'Inicial — requiere refuerzo' end) then
    raise exception 'El nivel no coincide con la nota.' using errcode = '22023';
  end if;

  -- Pistas / intentos: enteros entre 0 y 100, y "omitida" booleano.
  if jsonb_typeof(p_counts) is distinct from 'object' or jsonb_typeof(p_counts -> 'omitida') is distinct from 'boolean' then
    raise exception 'Conteos no válidos.' using errcode = '22023';
  end if;
  foreach v_key in array array['pregunta', 'transformacion', 'aplicacion', 'argumentacion'] loop
    if jsonb_typeof(p_counts -> v_key) is distinct from 'number'
       or (p_counts ->> v_key)::numeric <> trunc((p_counts ->> v_key)::numeric)
       or (p_counts ->> v_key)::numeric not between 0 and 100 then
      raise exception 'Conteo % no válido.', v_key using errcode = '22023';
    end if;
  end loop;

  -- Respuestas escritas: hasta 6 bloques, con longitudes acotadas.
  if p_answers is not null and jsonb_typeof(p_answers) is distinct from 'array' then
    raise exception 'Respuestas no válidas.' using errcode = '22023';
  end if;
  if jsonb_array_length(coalesce(p_answers, '[]'::jsonb)) > 6 then
    raise exception 'Demasiadas respuestas.' using errcode = '22023';
  end if;
  for v_item in select value from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) loop
    if jsonb_typeof(v_item) is distinct from 'object'
       or jsonb_typeof(v_item -> 'parte') is distinct from 'string'
       or jsonb_typeof(v_item -> 'pregunta') is distinct from 'string'
       or jsonb_typeof(v_item -> 'respuesta') is distinct from 'string'
       or char_length(v_item ->> 'parte') not between 1 and 120
       or char_length(v_item ->> 'pregunta') not between 1 and 300
       or char_length(v_item ->> 'respuesta') not between 1 and 2000 then
      raise exception 'Respuesta escrita no válida.' using errcode = '22023';
    end if;
    v_answers := v_answers || jsonb_build_array(jsonb_build_object(
      'parte', v_item ->> 'parte', 'pregunta', v_item ->> 'pregunta', 'respuesta', v_item ->> 'respuesta'));
  end loop;

  -- Fecha razonable: si el reloj del equipo está muy desfasado se usa la del servidor.
  if v_when > now() + interval '1 day' or v_when < now() - interval '400 days' then
    v_when := now();
  end if;

  insert into public.red_results (attempt_id, student_name, grade, level, score, criteria, counts, answers, completed_at)
  values (
    p_attempt_id, v_name, p_grade, p_level, round(p_score, 1),
    jsonb_build_object(
      'comprension', (p_criteria ->> 'comprension')::numeric, 'analisis', (p_criteria ->> 'analisis')::numeric,
      'aplicacion', (p_criteria ->> 'aplicacion')::numeric, 'argumentacion', (p_criteria ->> 'argumentacion')::numeric),
    jsonb_build_object(
      'pregunta', (p_counts ->> 'pregunta')::int, 'transformacion', (p_counts ->> 'transformacion')::int,
      'aplicacion', (p_counts ->> 'aplicacion')::int, 'argumentacion', (p_counts ->> 'argumentacion')::int,
      'omitida', (p_counts ->> 'omitida')::boolean),
    v_answers, v_when)
  on conflict (attempt_id) do nothing;
  get diagnostics v_inserted = row_count;

  return jsonb_build_object('saved', true, 'duplicate', v_inserted = 0);
exception
  when check_violation then
    raise exception 'Datos no válidos.' using errcode = '22023';
end $$;

-- ---------- 4. RPC DE LA DOCENTE --------------------------------------------

create or replace function public.red_teacher_login(p_code text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_hash  text;
  v_token text;
  v_exp   timestamptz := now() + interval '8 hours';
begin
  select teacher_code_hash into v_hash from public.red_settings where id = 1;
  if p_code is null or char_length(p_code) > 200 or v_hash is null
     or public.red_teacher_code_hash(p_code) <> v_hash then
    perform pg_sleep(0.8);
    raise exception 'Código incorrecto.' using errcode = '28P01';
  end if;
  delete from public.red_teacher_sessions where expires_at < now();
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.red_teacher_sessions (token_hash, expires_at) values (public.red_sha(v_token), v_exp);
  return jsonb_build_object('authenticated', true, 'token', v_token, 'expires_at', v_exp);
end $$;

create or replace function public.red_teacher_session(p_token text)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'authenticated', s.token_hash is not null,
    'expires_at', s.expires_at)
  from (select 1) x
  left join public.red_teacher_sessions s
    on s.token_hash = public.red_sha(p_token) and s.expires_at > now();
$$;

create or replace function public.red_teacher_logout(p_token text)
returns jsonb language sql security definer set search_path = ''
as $$
  delete from public.red_teacher_sessions where token_hash = public.red_sha(p_token);
  select jsonb_build_object('authenticated', false);
$$;

create or replace function public.red_teacher_list_results(p_token text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.red_require_teacher(p_token);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'attempt_id', r.attempt_id, 'name', r.student_name, 'grade', r.grade, 'level', r.level,
             'score', r.score, 'criteria', r.criteria, 'counts', r.counts, 'answers', r.answers,
             'completed_at', r.completed_at, 'is_demo', r.is_demo)
           order by r.completed_at desc)
    from public.red_results r), '[]'::jsonb);
end $$;

create or replace function public.red_teacher_delete_result(p_token text, p_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_deleted integer;
begin
  perform public.red_require_teacher(p_token);
  delete from public.red_results where attempt_id = p_attempt_id;
  get diagnostics v_deleted = row_count;
  return jsonb_build_object('deleted', v_deleted > 0);
end $$;

-- ---------- 5. PERMISOS -----------------------------------------------------
-- Supabase concede EXECUTE a anon/authenticated por defecto: se revoca todo y
-- se concede solo lo que la página necesita.
revoke all on function
  public.red_sha(text),
  public.red_fnv1a(text, bigint),
  public.red_teacher_code_hash(text),
  public.red_require_teacher(text),
  public.red_submit_result(uuid, text, text, text, numeric, jsonb, jsonb, jsonb, timestamptz),
  public.red_teacher_login(text),
  public.red_teacher_session(text),
  public.red_teacher_logout(text),
  public.red_teacher_list_results(text),
  public.red_teacher_delete_result(text, uuid)
from public, anon, authenticated;

grant execute on function
  public.red_submit_result(uuid, text, text, text, numeric, jsonb, jsonb, jsonb, timestamptz),
  public.red_teacher_login(text),
  public.red_teacher_session(text),
  public.red_teacher_logout(text),
  public.red_teacher_list_results(text),
  public.red_teacher_delete_result(text, uuid)
to anon;

-- ---------- 6. DATOS FICTICIOS DE DEMOSTRACIÓN (migración red_demo_data) -------
-- 10 estudiantes inventados (is_demo = true) para mostrar el panel. Notas y
-- niveles calculados con las mismas escalas de app.js. Para borrarlos:
--   delete from public.red_results where is_demo;
insert into public.red_results
  (attempt_id, student_name, grade, level, score, criteria, counts, answers, completed_at, is_demo)
values
  ('00000000-0000-4000-8000-000000000001', 'Valeria Montes Arrieta', '11.º', 'Sobresaliente', 5.0, '{"comprension":5,"analisis":5,"aplicacion":5,"argumentacion":5}'::jsonb, '{"pregunta":0,"transformacion":0,"aplicacion":0,"argumentacion":0,"omitida":false}'::jsonb, '[{"parte":"Hito 01 · Nacimiento de internet (ARPANET) (1969)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"La causa fue que querían una red que no dependiera de un solo computador central, así que todos los nodos eran iguales. Por eso, si un punto fallaba, la información buscaba otra ruta y seguía llegando."},{"parte":"Hito 02 · La World Wide Web (1989)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"La causa fue que la información en internet estaba dispersa y era difícil de encontrar. Con las páginas y los enlaces de hipertexto cualquier persona pudo navegar de un documento a otro y también publicar los suyos."},{"parte":"Hito 03 · Masificación del internet móvil (2000s)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"La causa fue que los celulares se volvieron baratos y con datos móviles. El efecto fue que ya no había que estar en un computador fijo: la información se consulta y se comparte en cualquier lugar y momento."},{"parte":"Hito 04 · Auge de plataformas y redes sociales (2000s a hoy)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"La causa fue que las plataformas permitieron que cualquiera publicara sin saber programar. Por eso la información ya no viene solo de medios: la crean millones de usuarios y el algoritmo decide qué vemos primero."},{"parte":"Actividad de relaciones","pregunta":"Explica cómo se conectan las dos transformaciones con sus hitos.","respuesta":"La información que viaja rápido y sin control se conecta con las redes sociales, porque ahí todos publican y comparten al instante. Que podamos estar conectados en todas partes viene del internet móvil, que quitó el límite del lugar fijo."},{"parte":"Recomendación final","pregunta":"Defiende tu recomendación con tus palabras, usando al menos un hito como evidencia.","respuesta":"Recomiendo permitir el celular solo en actividades guiadas por el docente. Las redes sociales muestran que la información circula muy rápido y sin filtro, así que el colegio debe enseñar a verificarla en vez de solo prohibirla."}]'::jsonb, '2026-11-17T14:12:00Z', true),
  ('00000000-0000-4000-8000-000000000002', 'Samuel Petro Ruiz', '10.º', 'Sobresaliente con apoyo puntual', 4.9, '{"comprension":4.6,"analisis":5,"aplicacion":5,"argumentacion":5}'::jsonb, '{"pregunta":1,"transformacion":0,"aplicacion":0,"argumentacion":0,"omitida":false}'::jsonb, '[{"parte":"Hito 01 · Nacimiento de internet (ARPANET) (1969)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"ARPANET se creó sin un centro que controlara todo, entonces cada nodo podía enviar y recibir datos. Si una parte se caía, el resto seguía funcionando y la información llegaba por otro camino."},{"parte":"Hito 02 · La World Wide Web (1989)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"La Web apareció porque se necesitaba organizar la información con enlaces. Desde ahí la gente común pudo entrar a páginas, leer, saltar de un tema a otro y compartir documentos sin ser experta."},{"parte":"Hito 03 · Masificación del internet móvil (2000s)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"Como los teléfonos empezaron a tener internet, la gente ya no necesitaba un computador en la casa. Ahora se comparte información desde el bus, el colegio o la calle, en cualquier momento del día."},{"parte":"Hito 04 · Auge de plataformas y redes sociales (2000s a hoy)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"Las redes sociales hicieron que publicar fuera muy fácil, entonces todos empezamos a producir contenido. El cambio es que la información se mueve mucho más rápido y muchas veces nadie revisa si es verdad."},{"parte":"Actividad de relaciones","pregunta":"Explica cómo se conectan las dos transformaciones con sus hitos.","respuesta":"Las dos transformaciones se conectan con sus hitos porque cada tecnología abrió una posibilidad. El internet móvil permitió estar conectado siempre y las plataformas sociales hicieron que todos pudieran publicar y compartir al momento."},{"parte":"Recomendación final","pregunta":"Defiende tu recomendación con tus palabras, usando al menos un hito como evidencia.","respuesta":"Mi recomendación es usar el celular en clase solo con un propósito claro. La evidencia es el hito de las redes sociales: la información se comparte en segundos sin revisar, por eso hay que aprender a usarlo con criterio."}]'::jsonb, '2026-11-17T14:20:00Z', true),
  ('00000000-0000-4000-8000-000000000003', 'Isabella Coronado Díaz', '11.º', 'Logrado alto', 4.4, '{"comprension":4.3,"analisis":4.3,"aplicacion":5,"argumentacion":4}'::jsonb, '{"pregunta":2,"transformacion":1,"aplicacion":0,"argumentacion":1,"omitida":false}'::jsonb, '[{"parte":"Hito 01 · Nacimiento de internet (ARPANET) (1969)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"La causa fue que se buscaba una red resistente, sin un computador principal. El efecto fue que los datos podían viajar por varios caminos y la comunicación no se cortaba aunque fallara un nodo."},{"parte":"Hito 02 · La World Wide Web (1989)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"La World Wide Web se creó para conectar documentos con enlaces. Eso cambió la forma de compartir porque cualquier persona con un navegador podía encontrar información y pasar de una página a otra."},{"parte":"Hito 03 · Masificación del internet móvil (2000s)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"El celular con internet hizo que la información fuera portátil. La causa fue que los teléfonos y los planes de datos se volvieron accesibles y por eso ahora compartimos desde cualquier sitio."},{"parte":"Hito 04 · Auge de plataformas y redes sociales (2000s a hoy)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"Las plataformas sociales aparecieron y la gente dejó de ser solo lectora para volverse creadora. Por eso hay muchísima información nueva cada minuto y se comparte sin que un editor la revise."},{"parte":"Actividad de relaciones","pregunta":"Explica cómo se conectan las dos transformaciones con sus hitos.","respuesta":"Primero me equivoqué, pero entendí que estar conectados todo el tiempo viene del internet móvil y que la participación masiva viene de las redes sociales. Cada hito causó un cambio distinto en cómo se mueve la información."},{"parte":"Recomendación final","pregunta":"Defiende tu recomendación con tus palabras, usando al menos un hito como evidencia.","respuesta":"Recomiendo un uso regulado del celular, con momentos definidos para trabajar. Con el internet móvil la información está en todas partes, y eso puede ayudar a aprender si el colegio orienta cómo buscar y comparar fuentes."}]'::jsonb, '2026-11-18T13:05:00Z', true),
  ('00000000-0000-4000-8000-000000000004', 'Juan Esteban Lozano Pérez', '10.º', 'Logrado alto', 4.3, '{"comprension":4,"analisis":4.3,"aplicacion":4,"argumentacion":5}'::jsonb, '{"pregunta":3,"transformacion":1,"aplicacion":1,"argumentacion":0,"omitida":false}'::jsonb, '[{"parte":"Hito 01 · Nacimiento de internet (ARPANET) (1969)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"ARPANET fue la primera red y la hicieron para que los computadores se comunicaran sin depender de uno solo. Por eso la información podía seguir circulando aunque se dañara una parte de la red."},{"parte":"Hito 02 · La World Wide Web (1989)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"La web hizo que la información se pudiera ver en páginas con enlaces. Antes era más difícil y solo lo usaban expertos, después cualquiera podía buscar cosas y compartirlas con otros."},{"parte":"Hito 03 · Masificación del internet móvil (2000s)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"El internet móvil llegó cuando los celulares tuvieron conexión. El efecto fue que la información se lleva en el bolsillo y se puede compartir en cualquier momento, no solo en la casa."},{"parte":"Hito 04 · Auge de plataformas y redes sociales (2000s a hoy)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"Las redes sociales hicieron que todos pudieran subir fotos, videos y opiniones. Eso cambió todo porque ahora las noticias se riegan muy rápido, aunque a veces son falsas."},{"parte":"Actividad de relaciones","pregunta":"Explica cómo se conectan las dos transformaciones con sus hitos.","respuesta":"La transformación de estar conectados en todo lugar va con el internet móvil, y la de que todos publiquen va con las plataformas sociales. Al principio confundí una, pero la pista me ayudó a ver la diferencia."},{"parte":"Recomendación final","pregunta":"Defiende tu recomendación con tus palabras, usando al menos un hito como evidencia.","respuesta":"Yo recomiendo que el celular se use solo en algunas clases, cuando el profesor lo pida. Las redes sociales muestran que la información circula sin control, entonces es mejor usarlo con una guía para no distraerse ni creer todo."}]'::jsonb, '2026-11-18T13:40:00Z', true),
  ('00000000-0000-4000-8000-000000000005', 'Mariana Hoyos Castaño', '11.º', 'Logrado', 3.8, '{"comprension":3.7,"analisis":3.6,"aplicacion":4,"argumentacion":4}'::jsonb, '{"pregunta":4,"transformacion":2,"aplicacion":1,"argumentacion":1,"omitida":false}'::jsonb, '[{"parte":"Hito 01 · Nacimiento de internet (ARPANET) (1969)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"La causa de ARPANET fue conectar computadores de universidades sin un centro único. Por eso, cuando un nodo dejaba de funcionar, la red seguía mandando información por otro lado."},{"parte":"Hito 02 · La World Wide Web (1989)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"La causa fue que querían compartir documentos de forma más sencilla, y con los enlaces se pudo. Desde entonces más personas empezaron a leer y publicar información en internet."},{"parte":"Hito 03 · Masificación del internet móvil (2000s)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"Los celulares empezaron a traer internet y por eso ahora la gente revisa información todo el tiempo. Ya no se necesita un lugar fijo para conectarse."},{"parte":"Hito 04 · Auge de plataformas y redes sociales (2000s a hoy)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"Las redes sociales hicieron que cualquiera pueda publicar, y por eso hay mucha información, pero no toda es confiable. La gente comparte rápido sin pensar mucho."},{"parte":"Actividad de relaciones","pregunta":"Explica cómo se conectan las dos transformaciones con sus hitos.","respuesta":"Las transformaciones se conectan porque el internet móvil hizo que estuviéramos conectados siempre y las redes sociales hicieron que todos participaran. Me costó un poco distinguir cuál iba con cada hito."},{"parte":"Recomendación final","pregunta":"Defiende tu recomendación con tus palabras, usando al menos un hito como evidencia.","respuesta":"Recomiendo que el celular se use con reglas claras durante la jornada. Las plataformas sociales muestran que la información se comparte muy rápido, y en el colegio se puede enseñar a pensar antes de compartir."}]'::jsonb, '2026-11-19T15:10:00Z', true),
  ('00000000-0000-4000-8000-000000000006', 'Andrés Felipe Galeano Ortiz', '10.º', 'Logrado', 3.5, '{"comprension":3.4,"analisis":3.6,"aplicacion":3,"argumentacion":4}'::jsonb, '{"pregunta":5,"transformacion":2,"aplicacion":2,"argumentacion":1,"omitida":false}'::jsonb, '[{"parte":"Hito 01 · Nacimiento de internet (ARPANET) (1969)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"ARPANET se hizo para conectar computadores y que no hubiera uno solo mandando. Así si uno se dañaba los otros seguían y la información no se perdía en el camino."},{"parte":"Hito 02 · La World Wide Web (1989)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"La web permitió ver páginas en internet con enlaces. Eso hizo que la gente pudiera buscar información más fácil y compartirla con más personas que antes."},{"parte":"Hito 03 · Masificación del internet móvil (2000s)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"Con el celular la gente puede usar internet donde quiera. La causa es que los teléfonos ya traían datos y por eso la información se comparte en cualquier parte."},{"parte":"Hito 04 · Auge de plataformas y redes sociales (2000s a hoy)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"Las redes sociales como Facebook o Instagram hicieron que la gente publique de todo. Ahora la información se mueve rápido y llega a muchas personas al tiempo."},{"parte":"Actividad de relaciones","pregunta":"Explica cómo se conectan las dos transformaciones con sus hitos.","respuesta":"El internet móvil se conecta con estar siempre conectados y las redes sociales con que todos compartimos. Tuve que intentarlo varias veces para unir bien cada transformación con su hito."},{"parte":"Recomendación final","pregunta":"Defiende tu recomendación con tus palabras, usando al menos un hito como evidencia.","respuesta":"Recomiendo que el celular se pueda usar pero con control del profesor. Porque con las redes sociales la información se comparte rápido y si no hay control los estudiantes se distraen mucho en clase."}]'::jsonb, '2026-11-19T15:35:00Z', true),
  ('00000000-0000-4000-8000-000000000007', 'Daniela Sofía Pacheco Lora', '11.º', 'Básico / en proceso', 3.0, '{"comprension":3.1,"analisis":3,"aplicacion":3,"argumentacion":3}'::jsonb, '{"pregunta":6,"transformacion":3,"aplicacion":2,"argumentacion":2,"omitida":false}'::jsonb, '[{"parte":"Hito 01 · Nacimiento de internet (ARPANET) (1969)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"ARPANET fue cuando se conectaron los primeros computadores en red. Esto hizo que la información pudiera enviarse de un lugar a otro sin depender de un solo equipo central."},{"parte":"Hito 02 · La World Wide Web (1989)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"La web fue creada para que la información estuviera en páginas. Después de eso la gente pudo entrar a internet a buscar cosas, y compartir información se volvió más común."},{"parte":"Hito 03 · Masificación del internet móvil (2000s)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"El internet móvil hizo que todos tuvieran internet en el celular. Por eso ahora se comparte información todo el tiempo y en todas partes, como en el colegio."},{"parte":"Hito 04 · Auge de plataformas y redes sociales (2000s a hoy)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"Las redes sociales hicieron que la gente se comunique más y comparta su vida. La información ahora va muy rápido y muchas veces no sabemos de dónde viene."},{"parte":"Actividad de relaciones","pregunta":"Explica cómo se conectan las dos transformaciones con sus hitos.","respuesta":"Estar conectados siempre es por el celular con internet y publicar todos es por las redes sociales. Me equivoqué varias veces porque pensaba que todo venía de la web."},{"parte":"Recomendación final","pregunta":"Defiende tu recomendación con tus palabras, usando al menos un hito como evidencia.","respuesta":"Mi recomendación es usar el celular solo en el descanso. Porque las redes sociales distraen y la información que se comparte no siempre es cierta, entonces en clase es mejor no tenerlo a la mano."}]'::jsonb, '2026-11-20T14:00:00Z', true),
  ('00000000-0000-4000-8000-000000000008', 'Laura Camila Vergara Sierra', '10.º', 'Sobresaliente con apoyo puntual', 4.5, '{"comprension":4.6,"analisis":4.3,"aplicacion":5,"argumentacion":4}'::jsonb, '{"pregunta":1,"transformacion":1,"aplicacion":0,"argumentacion":1,"omitida":false}'::jsonb, '[{"parte":"Hito 01 · Nacimiento de internet (ARPANET) (1969)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"La causa fue diseñar una red descentralizada para que ningún fallo la tumbara. Gracias a eso los mensajes podían tomar caminos distintos y la red se volvió más resistente."},{"parte":"Hito 02 · La World Wide Web (1989)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"La causa fue la necesidad de enlazar documentos que estaban en distintos computadores. El efecto fue que navegar se volvió fácil y la información empezó a estar al alcance de mucha más gente."},{"parte":"Hito 03 · Masificación del internet móvil (2000s)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"La causa fue que los smartphones y los datos móviles se volvieron comunes. Por eso compartir información dejó de depender de un escritorio y ahora ocurre en cualquier momento del día."},{"parte":"Hito 04 · Auge de plataformas y redes sociales (2000s a hoy)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"Las plataformas sociales dieron a cada persona la posibilidad de publicar y comentar. El efecto es que circula muchísima información a gran velocidad y los algoritmos eligen qué nos muestran."},{"parte":"Actividad de relaciones","pregunta":"Explica cómo se conectan las dos transformaciones con sus hitos.","respuesta":"El internet móvil explica que podamos estar conectados en cualquier lugar, y las plataformas sociales explican que la información la produzcan y compartan millones de personas. Una tecnología abre la posibilidad y luego cambia la práctica social."},{"parte":"Recomendación final","pregunta":"Defiende tu recomendación con tus palabras, usando al menos un hito como evidencia.","respuesta":"Recomiendo integrar el celular en actividades con un objetivo de aprendizaje. El hito del internet móvil muestra que la información ya está en el bolsillo, así que conviene enseñar a usarla bien en lugar de esconderla."}]'::jsonb, '2026-11-20T14:25:00Z', true),
  ('00000000-0000-4000-8000-000000000009', 'Carlos Mario Ballesteros Negrete', '10.º', 'Inicial — requiere refuerzo', 1.7, '{"comprension":2.5,"analisis":2.3,"aplicacion":1,"argumentacion":1}'::jsonb, '{"pregunta":8,"transformacion":4,"aplicacion":0,"argumentacion":0,"omitida":true}'::jsonb, '[{"parte":"Hito 01 · Nacimiento de internet (ARPANET) (1969)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"ARPANET fue el comienzo de internet, conectaba computadores. Eso hizo que se pudiera mandar información entre ellos y fue el inicio de todo lo que tenemos ahora."},{"parte":"Hito 02 · La World Wide Web (1989)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"La web es lo que usamos para entrar a páginas. Cambió porque ahora la información está en internet y la gente la puede buscar en vez de ir a una biblioteca."},{"parte":"Hito 03 · Masificación del internet móvil (2000s)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"El internet en el celular hizo que la gente esté pegada al teléfono todo el día. Ahora se comparten cosas en cualquier lado y a cualquier hora del día."},{"parte":"Hito 04 · Auge de plataformas y redes sociales (2000s a hoy)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"Las redes sociales hicieron que todos publiquen cosas y se haga viral. La información se comparte rápido y por eso salen muchas noticias falsas en internet."},{"parte":"Actividad de relaciones","pregunta":"Explica cómo se conectan las dos transformaciones con sus hitos.","respuesta":"Las dos transformaciones tienen que ver con internet y con el celular. Me costó mucho relacionarlas y necesité varias pistas para saber cuál iba con cada hito."}]'::jsonb, '2026-11-21T13:15:00Z', true),
  ('00000000-0000-4000-8000-000000000010', 'Tomás Alejandro Rivera Cuello', '11.º', 'Inicial — requiere refuerzo', 2.1, '{"comprension":2.8,"analisis":1.6,"aplicacion":2,"argumentacion":2}'::jsonb, '{"pregunta":7,"transformacion":5,"aplicacion":3,"argumentacion":3,"omitida":false}'::jsonb, '[{"parte":"Hito 01 · Nacimiento de internet (ARPANET) (1969)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"ARPANET lo hicieron para conectar computadores en Estados Unidos. Gracias a eso se empezó a compartir información entre lugares lejanos sin tener que llevarla en persona."},{"parte":"Hito 02 · La World Wide Web (1989)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"La web la crearon para que hubiera páginas en internet. Así la gente empezó a usar internet más y a buscar información de muchos temas diferentes."},{"parte":"Hito 03 · Masificación del internet móvil (2000s)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"El celular hizo que todos tuvieran internet. Ahora la gente comparte fotos y mensajes desde cualquier parte y eso hace que la información se mueva más."},{"parte":"Hito 04 · Auge de plataformas y redes sociales (2000s a hoy)","pregunta":"¿Cuál fue la causa de este hito y qué cambió en la forma de compartir información por eso?","respuesta":"Las redes sociales son donde todos publican cosas y hablan con amigos. Cambiaron la forma de compartir porque ahora cualquier cosa se puede volver viral en un día."},{"parte":"Actividad de relaciones","pregunta":"Explica cómo se conectan las dos transformaciones con sus hitos.","respuesta":"Pienso que las dos transformaciones vienen del internet en general, porque todo se conecta. Después vi que una era del celular y otra de las redes, pero me equivoqué varias veces."},{"parte":"Recomendación final","pregunta":"Defiende tu recomendación con tus palabras, usando al menos un hito como evidencia.","respuesta":"Recomiendo prohibir el celular en el colegio porque distrae. Las redes sociales hacen que los estudiantes no pongan atención y además hay mucha información falsa que circula por WhatsApp y otras aplicaciones."}]'::jsonb, '2026-11-21T13:50:00Z', true)
on conflict (attempt_id) do nothing;
