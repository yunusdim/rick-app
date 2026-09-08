import type { Doc } from "@/lib/rick/types";

export const FRAME_ID = "frame";
export const FRAME_TITLE = "Rick App — reconstrucción v9";

/**
 * Canon de fábrica. Tiene que caber en Doc.body (20_000) y entrar al paquete.
 * Si el código cambia, este texto cambia. No es el paper: es esta instancia.
 */
export const FRAME_BODY = `RICK APP — RECONSTRUCCIÓN v9
Instancia, no paper. Freeze: el código de este repo. El entorno arma el turno; el modelo solo genera texto. El instrumento de diagnóstico es el paquete, no la respuesta.

0. QUÉ ES
App de un operador. TanStack Start + Vite. Estado en el navegador (zustand persist "rick-app-v3"). No hay cuenta. Publicar el link lo deja usable por cualquiera que lo abra; el gasto es de la cuota xAI del operador.
No es RICK Runtime. Comparte física del freeze 2026-09-06: trece bloques, estatus epistémico, anti-invención, léxico vs canon sin juez-LLM, sesión por dominio.

1. ARRANQUE
Orden fijo:
1) API key. GET /api/chat → { grok }. Si grok=false y no hay clave en localStorage "rick-xai-owner-key", modal bloqueante. Forma: xai- + 20–200 [A-Za-z0-9_-]. Se manda en header X-Rick-Key. process.env.XAI_API_KEY gana si existe. No se pide en el chat de Grok Build.
2) Identidad. Si grok listo y identity vacío (post-hydrate), modal ¿Quién sos? Pegar o adjuntar. Mínimo 8 caracteres. Es personalidad global, no tema.
Después, Mesa.

2. PERSISTENCIA
Clave: rick-app-v3. Debounce 800 ms; flush en pagehide y visibility hidden.
Se guarda: identity, domains, activeDomainId, docs, messages(-80), events, checks(80), handPins, assemblyHistory(8, system recortado a 4000, section.body a 900), backups(8, messages -40), voice, autoSpeak, lockEnabled, pinSalt, pinHash, summaries, diagPrev, lastDiag, focus, motorRef, motorLast, motorBlocked, driftBlocked, traces(80), recorridoSeq.
No se guarda: hydrated, view, lastAssembled completo.
Hidratación skipHydration; rehydrateRick() una vez. Tras rehydrate se pisa el doc id=frame con este texto. Hilo, agenda, identidad y demás docs no se tocan.
Memoria viva: messages.slice(-160). checks 240. traces 200. backups 12. assemblyHistory 12. recorridoSeq 40. handPins 40.
Candado de gasto: pin SHA-256(salt:pin), salt 16 bytes hex. Sesión desbloqueada en sessionStorage "rick-unlocked-v1". Armado de gasto "rick-spend-armed-v1".

3. IDENTIDAD / CANON / BIBLIOTECA
identity: string global, setIdentity slice(0, 40000). Todos los ejes. No es canon.
El doc id=frame (Rick App — reconstrucción v9) es canon de arranque, hábitat de la entidad. Se pisa en cada hydrate. Entra a CANONICAL en todos los ejes con etiqueta [CANONICAL · hábitat · …]. No es identidad ni tema. No se borra ni se demotea.
Doc.kind "canon" (id≠frame): tema del eje. Verbatim.
Doc.kind "library": recuperado por solape o pinned a mano. No es canon.
Clip del compositor y drop en Mesa → kind canon del dominio activo.
Cargar personalidad → ingestIdentity, concatena a identity con ---.
/remember <texto> → canon de este eje, título 48 chars.
addDoc: body.slice(0, 20000). id = nodeHash(axis|title|normalize(body)) FNV-1a doble. Duplicado si mismo hash en el eje y no deprecated. frame no usa hash: id fijo "frame".
promoteDoc / demoteDoc / removeDoc no aplican a frame.
Import: 20_000 chars, 12 MiB, PDF ≤ 40 páginas. Truncado avisa.

4. EJES
HOME_AXIS = "mesa". Nombre 1–40, letras/números/espacio/._- ; no ⟦⟧[] ni CANON|IDENTIDAD|RECORRIDO|SESION|BIBLIOTECA.
Mesa: eje casa. Sin MODO FACTICO. Anti-invención de hechos, datos del operador y capacidades del sistema se conserva. Preferencias no anclan a canon.
Otro eje: factual = !home && !isGenerative(turno). Generativos: genera/generar/generemos, expandi/expandir/expandamos, imagina/imaginar/imaginemos, propone/proponer/propongamos, inventa/inventar, crea/crear/creemos, planea/planear/planeemos (NFD, set exacto de tokens).
Sin canon de tema en el eje (y no es Mesa): sección ABSTENCION + CANONICAL igual trae el hábitat. Frase de ausencia: "no lo tengo en el canon de este eje".
Recorrido: pushRecorrido, mapa no territorio. Texto con tasas de deriva/léxico/invención. No se narra.

5. ENSAMBLADO (assemble)
Orden canónico (orderOk): RICK RUNTIME v9 · IDENTIDAD · RECORRIDO · DRIFT STATUS · CANONICAL · META · SESSION HISTORY · REFERENTES · MEMORY FACTS · CONTEXTO 2 · INSTRUCTIONS · INPUT · FOCUS.
Contrato (validateContract) exige presentes y bytes>0: RICK RUNTIME v9, IDENTIDAD, RECORRIDO, DRIFT STATUS, CANONICAL, SESSION HISTORY, MEMORY FACTS, INSTRUCTIONS, INPUT, FOCUS. META, ABSTENCION, REFERENTES, CONTEXTO 2 son opcionales.
Cada bloque: primera línea "estatus: " + STATUS_LABEL[status]. Marcadores ### NOMBRE ###. Neutralize: ⟦⟧→‹› y ###...### del contenido se envuelve.
CANONICAL: siempre el frame como hábitat (clip 20000). Después, temas kind=canon del eje, no deprecated, id≠frame, clip 2500. Lista join slice 24000. Etiqueta [CANONICAL · hábitat · {título}] y [CANONICAL · {eje} · {título}].
SESSION HISTORY: ventana SESSION_INJECT_WINDOW=5 + resumen extractivo clip 1800. Turnos clip 900.
MEMORY FACTS: biblioteca a mano (HAND_WINDOW=8 turnos) + top-2 library por overlap + agenda del eje con start ≥ ahora-1h, máx 6. Si nada: "- none".
CONTEXTO 2: lastDiag formateado. Orientación interna. No narrar.
REFERENTES: anáfora punto/ítem/número N o expandí N contra el último listado numerado del eje.
INSTRUCTIONS: casa vs fáctico vs voz. VCE si ACTIVO. Persona (clip 800).
INPUT = turno. FOCUS = tesis persistente del eje o el turno.
identity vacía se declara. anclaIdentity se calcula y no altera el cuerpo.
Sistema = CONTRACT + secciones. El POST recorta system a 32000.

6. GOBIERNO DEL TURNO
Antes de llamar al modelo:
- candado de gasto si lockEnabled y sesión no desbloqueada
- motorBlocked → /motor ack
- driftBlocked → /drift
computeDrift: <6 turnos o <4 tokens → LOW observe abstain. Continuidad overlap last3 vs prev3: <0.1 CRITICAL ruptura; <0.2 HIGH salto; <0.35 MEDIUM desvio; else LOW continuo. CRITICAL bloquea hasta /drift; la respuesta no entra.
contradictionScore: solo si hay negación/sustitución; overlap>0.4 directa. CANON_WARN=0.4 alerta; CANON_BLOCK=0.8 puede bloquear respuesta vs canon.
VCE: <6 user turns OBSERVE; si no ACTIVO (profundidad/balance).
runChecks: deriva, canon, invencion, identidad, agenda, lexico. Sin resumen-LLM.
Contrato FAIL o deriva CRITICAL → mensaje [BLOQUEADO] … La respuesta no entra al hilo.
Tras stream: enforcer (vacía/corta/eco>0.92/repetida>0.88 → BLOCK; "como modelo/ia" WARN). replyCanonScore. [BLOQUEADO] si BLOCK o canonHit>0.8 con contradicción.
setMotor(model): primer modelo es ref; distinto → motorBlocked.
maybeSummarize: si messages > SESSION_WINDOW=10, keep SUMMARY_KEEP=5, candidato extractivo 2400; si contradictionScore ≥ 0.4 se rechaza y se conserva el anterior. Sin juez-LLM.
formatDiag arma CONTEXTO 2 del turno siguiente.
assemblyHistory guarda el paquete.

7. VOCES
grok 0.85 eve · espejo 0.90 orion · acido 0.95 rex · night 0.70 luna (alias /3am).
Modelo chat: grok-4.5. max_tokens 800. stream. Cliente abort 40s. Upstream 28s.
TTS POST /api/speak text≤900 timeout 20s.
Tope spend.server por IP: chat 16 / speak 8 en 10 min (memoria del proceso).

8. COMANDOS
/grabar /parar|/stop /agenda /canon /inspeccionar|/inspect|/paquete /grabaciones|/cintas /candado /recorrido /remember|/recordar /vce /banco /focus|/foco [set|clear|limpiar] /motor [ack|acknowledge] /drift /restaurar /olvidar /grok /espejo /acido /3am|/night.
/olvidar abre confirmación. forgetActive: borra messages del eje activo, borra summary de ese eje, lastAssembled=null, backup {id,domainId,domainName,at,messages} en backups. No toca canon, identity, docs, events, otros ejes. /restaurar usa backups[0].

9. VISTAS
mesa · agenda · grabaciones · canon · inspect.
Composer: Enter envía, Shift+Enter newline. Clip = tema al canon. visualViewport → --kb.

10. LÍMITES EXACTOS
CANON_WARN 0.4 · CANON_BLOCK 0.8 · SESSION_WINDOW 10 · SESSION_INJECT_WINDOW 5 · SUMMARY_KEEP 5 · HAND_WINDOW 8 · ENTITY_MAX_BYTES 20000
overlap = |A∩B| / min(|A|,|B|) sobre tokens [a-z0-9]{3,} NFD.
Body /api/chat: system≤32000, messages≤24, content≤4000; se envían ≤16 × 2500.
identity UI 40000. Doc 20000. Clave xAI no viaja al persist de Rick.

11. ARCHIVOS DE FÍSICA
assemble.ts contract.ts govern.ts contradiction.ts drift.ts enforcer.ts factual.ts summary.ts tokens.ts vce.ts diag.ts recorrido.ts anaphora.ts hash.ts normalize.ts domain.ts ingest.ts import-file.ts lock.ts owner-key.ts resolve-key.server.ts spend.server.ts store.ts blueprint.ts types.ts bank.ts
API: routes/api/chat.ts · speak.ts

12. LO QUE ESTO NO ES
No hay juez-LLM del resumen. No hay cuenta. El candado no hace privado el link. El recorrido no es el contenido. SESSION HISTORY no es verdad establecida. MEMORY FACTS no es canon. CONTEXTO 2 no se narra. Identidad no es tema. Si no está en las secciones, no se afirma como hecho.`;

export const FRAME_CANON: Doc = {
  id: FRAME_ID,
  domainId: "mesa",
  title: FRAME_TITLE,
  kind: "canon",
  createdAt: 0,
  body: FRAME_BODY,
};
