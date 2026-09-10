# Rick App

**Fail-closed context governance in the browser**

An instance of the RICK Runtime physics

Diego Gabriel Impieri  
Independent researcher · Argentina  
ORCID 0009-0003-9082-650X

Technical report · This document confronts commit `f8e6465` of [github.com/yunusdim/rick-app](https://github.com/yunusdim/rick-app) and the chrome revision that follows it on 10 September 2026. The freeze of 8 September 2026 remains at `b1df8bb` / tag `freeze-v9-2026-09-08`. That snapshot is not rewritten.

Browser · TanStack Start + Vite · zustand persist (`rick-app-v3`) · Engine chosen by the person who opens it.

Code: github.com/yunusdim/rick-app · Instance: rick-app-three.vercel.app

*The authority of truth is the live code in the repository. This document confronts it, never the reverse.*

A served build identifies itself under the title with the word **actualizada** and the short git object name of that build. A tab that does not show those two marks is not this revision.

---

## Abstract

RICK Runtime is a deterministic context-governance layer for a language model, in production on an Android phone [27]. This report documents Rick App: an instance of the same physics on a browser substrate, with no account and no server-side user state, where every governance decision is local and deterministic and no decision is delegated to a model. The person who opens it chooses the engine and supplies their own key, which stays in their browser; the server holds no provider key.

The machine assembles a thirteen-section system context each turn in a declared canonical order, each section carrying its epistemic status on its first line. A contract is verified before the model is called: ten required sections must be present, each exactly once, each with more than zero UTF-8 bytes, with no undeclared names, in the declared order, with the habitat-inclusive canon packed without silent omission, and within the transport ceilings. If the contract fails, the call is not made and the turn is cut.

Further deterministic gates guard the turn: a drift break that persists across reload until the operator acknowledges it; a writer lock so a second tab cannot spend a call; and a post-stream **admission**. Streaming text is provisional. A reply is admitted only if the provider termination is a valid end of turn **and** the enforcer is not BLOCK. An abort, an empty body, a length stop or a transport error is evidence of an attempt, not conversation. Admitted text may be spoken; rejected text is not.

A grammatical trigger, not a confidence score, switches the machine between generative and factual mode; in factual mode with no canon in the axis, the absence is declared in a fixed sentence rather than filled.

Document identity is a SHA-256 of the original body. Lexical normalisation is used for selection, not for identity. Compaction is extractive, incremental by axis, and gated against canon; a rejected candidate does not advance the cursor.

An adversarial prior-art search (Part IV) attacked seven mechanisms of the freeze machine and found named antecedents for the generic component of every one. What it did not find, in any of the seven, is the same thing: a system that fails closed and requires an explicit operator acknowledgment to continue. Amendments after `b1df8bb` are described as instance physics. They are not re-claimed against a new search.

**Keywords:** fail-closed context assembly · prompt contract validation · deterministic governance · epistemic status labelling · grammatical abstention trigger · operator acknowledgment · fail-closed gate · bring-your-own-key · local-first LLM client · stream admission · content-addressed canon.

---

## Hypothesis

The RICK Runtime v9 report established that long-horizon coherence is a property of the execution environment, not of the model. This report tests a narrower and harder claim about how that environment should fail:

**Governance that only observes is not governance. A governing environment must be able to refuse the turn, and the refusal must be legible to the operator.**

Consequences the machine implements:

- The assembled context is a contract, not a template. If it does not satisfy its declared structure, the call is not made. An assembly that is merely attempted is not governed.
- A gate that fires must halt, not warn. Drift at critical, a contract failure, a non-integral canon, a transport overflow, a second-tab writer, and an admission BLOCK each stop the turn; the response does not enter the thread as conversation.
- Resuming is an operator act. `/drift` and `/motor` ack are commands, not timeouts. No condition clears itself. Reloading the tab is not `/drift`.

The counter-hypothesis is that this is over-restrictive: that a client which refuses turns is unusable. Part III reports what happened when it was operated.

---

## Contributions

An adversarial prior-art search was run over academic indices, repositories, project documentation and community sources. Its instruction was to refute each claim, not confirm it. It found named prior art for the generic component of all seven mechanisms below, as of the freeze at `b1df8bb`. Each claim is stated after that search, at the scope the evidence allows, with what was found against it.

Amendments in `f8e6465` and the chrome revision that follows it are listed after the original six. They describe the live machine. They are not offered as new priority claims.

**Primary — the fail-closed section contract.** Thirteen named sections in a declared canonical order; `validateContract` verifies before the model call that ten required sections are present with UTF-8 bytes > 0, each exactly once, that no undeclared name appears, and that `orderOk` holds with strictly increasing indices (equal consecutive indices fail). On failure the call is not made and the turn is cut.

*Prior art found:* prompt-contract formulations exist but validate the output or serve as authoring templates [4][5]; assembly frameworks maintain named sections in order without asserting them — Priompt drops low-priority blocks under budget [6], POML validates markup at build time [7], DSPy signatures warn but do not abort [8]; gateway guardrails do run pre-call and can deny, but they check content — injection, PII, jailbreak — not structural presence and order [9]; and one 2026 paper formalises the invariant that a policy must reach the decision state present, sound and correctly bound [10], but measures rather than aborts. The search found no system combining all three properties over the assembled input: declared roster, verified order, and refusal before the call is spent. That combination is the claim.

**1. Grammatical trigger for abstention.** Outside the home axis, `factual = !home && !isGenerative(turn)`, where `isGenerative` is a closed and declared set of Spanish generative verbs — generar, expandir, imaginar, proponer, inventar, crear, planear and their conjugations, NFD-normalised. In factual mode with no canon in the axis, the machine emits a declared ABSTENCION section and one fixed sentence: *no lo tengo en el canon de este eje*. *Prior art found:* abstention is a saturated field — a TACL survey covers query, model and human-value perspectives [11], and AbstentionBench spans twenty datasets and uses an LLM judge to score it [12]. In all of it the trigger is model confidence or a judge. Deterministic intent detection by morphosyntactic rules exists in support routing [13]. The search found no system where the trigger for factual mode and abstention is a closed verb lexicon. The claim is the trigger, not the abstention.

**2. Epistemic status per section.** Every block opens with `estatus:` and a label from a closed taxonomy, so the model receives each block’s epistemic standing declared: what is verified canon, what is session history that is not established truth, what is retrieved memory that is not canon. *Prior art found:* provenance and trust labelling of retrieved chunks is well developed in RAG — credibility scoring [14], confidence annotation of spans in traces [15]; and epistemic framing of prompts is taught as practice, distinguishing context from frame with explicit checkable constraints [16]. The search found no system typing every section of the assembled system prompt with a declared epistemic status from a closed set. The claim is the per-section typing inside the contract.

**3. Summary governance without a judge.** Above ten admitted messages, `maybeSummarize` produces an extractive candidate — not model-generated — keeping the last five turns. The candidate is scored with `contradictionScore` against **canon text**, not against the previous summary (`CANON_WARN` = 0.4: lexical overlap plus negation and substitution). On rejection the previous summary is kept and the compaction cursor does not advance. Reprocessing the same interval without new messages is a declared no-op (`idempotente`). *Correction relative to the freeze report:* that report stated the gate compared the candidate to the previous summary. The freeze code, and this revision, compare it to canon. This document follows the code. *Prior art found:* extractive summarisation for context windows exists [17]; deterministic memory pipelines that invoke no model in the management loop exist [18]; a write-time admission gate that validates a candidate fact before committing it to memory is published, but it decides by querying the model K times [32]. Every deployed compaction the search checked uses a model to summarise. The claim remains the deterministic validation gate over successive summaries, not the extraction. The live comparison target is canon.

**4. Engine identity pin, fail-closed.** The first model observed becomes the reference; if a later turn reports a different one, the machine enters `motorBlocked` and requires `/motor` ack to continue. It detects a silent provider swap. *Prior art found:* silent model updates are documented across providers [20][21]; runtime verification of the loaded model is done in the wild [22]. All of them detect and alert. The search found none that halts the conversation and requires an explicit operator command to proceed. The claim is the fail-closed response, not the detection.

**5. Deterministic gates at three points of the cycle, plus admission.** Contract FAIL and drift CRITICAL block before the model is called; after the stream, admission evaluates termination and then the generated response — empty, shorter than 20 characters, echo above 0.92 of the input, repeated above 0.88 of the previous, model-disclaimer markers as WARN. On BLOCK the response is not admitted: it does not enter SESSION HISTORY as conversation, and it is not spoken. *Prior art found:* deterministic degeneration and repetition detection at the application layer is published [23][24][25]; circuit breakers over agent turns are an established pattern [26]. The individual detectors are prior art. The claim is the orchestration: deterministic gates at the points of the cycle, two of which refuse before spending the call, one of which discards the turn, none of which clears itself. Admission of transport termination is an amendment of 10 September 2026: a cut stream is no longer written as if it were a completed reply.

**Not claimed.** Numeric anaphora resolution — resolving *el punto 3* against the last numbered listing in the axis, locally, and injecting a REFERENTES section — is implemented and is not claimed as a contribution. Deterministic reference resolution is mature [1][2][3].

**Amendments in the live revision, not re-claimed.** They are physics of the instance. A new prior-art search was not run for them.

- **Canon integrity.** A document larger than 20 000 UTF-8 bytes is refused. Packing into CANONICAL that would omit a block sets `canonIntegral = false`. The call is not made. A clip is not presented as the document.
- **Content hash.** Identity of a document is SHA-256 of the original body. Lexical `nodeHash` remains for selection. `x>0` and `x<0` are distinct documents.
- **Transport contract.** System ≤ 32 000 UTF-8 bytes; each message ≤ 2 500 UTF-16 code units; at most 16 history turns. The relay does not silently re-slice what it accepted.
- **One writer.** `Web Locks` (`rick-app-v3-writer`). A second tab is a reader. Persist records a revision; an older revision does not overwrite a newer one. A failed write is declared.
- **Forget restores the summary.** `/olvidar` backs up the thread and the summary/cursor of that axis. `/restaurar` returns both.
- **Per-axis retention.** Messages are kept per axis (160 in memory, 80 on persist), not as a global tail that can erase another axis.
- **Capsule.** Inspect → Exportar / Importar. Identity, axes, documents, session, summaries, governance, backups. No API keys. Fingerprint is SHA-256 of the payload.
- **Replay.** A full recorded turn can be replayed locally without calling the model. A partial record is labelled partial and is not presented as an exact reproduction.
- **Motor capabilities.** Chat and voice are separate. Custom and OpenRouter TTS are `unknown`, not pretended. Dictation fills the draft; it does not send.
- **Build stamp.** `/api/version` is `no-store`. A tab whose served object name differs from the running script offers reload. Reload does not wipe the axis.

The pattern across the six claimed remains: the generic component is antecedent and the missing element is fail-closed halt with operator acknowledgment. That pattern is the claim this report makes above any individual mechanism.

---

# Part I · Canon of the machine

## 1. What it is

An instance: a place, not the paper. It shares the physics — the assembled package is the diagnostic instrument; the response is not.

There is no account and no server-side user state. State lives in the browser of whoever opens the link. That person chooses the engine at the door — a declared list of providers, or a custom endpoint given as a base URL — writes the model string, which is editable, and pastes the key for that provider. The key is loaded into their own browser: it is never exported, never appears in the assembled package, never appears in a capsule, and is never persisted server-side. The server holds no provider key of its own. The spend is theirs. Publishing the link therefore hands over the machine, not a quota. The spend lock stops this screen; it does not make the link private.

The default voice is called Rick. The engine that writes may carry another name, further back. That is not narrated. The chrome of this revision does not display the words *mesa* or *casa*. The home-axis identifier in state remains `mesa`. Skin is not physics.

The environment assembles the turn. The model only generates text.

## 2. The entity

Who it is, the operator writes once, at the start, after the key. It is identity: transversal across every axis. It is not a topic. It is not canon. If it is missing, the system proposes no content.

Where it lives is stated by the habitat document (Spanish reconstruction, injected as CANONICAL on every turn, in every axis, under the habitat label). It is not deleted and not degraded. The English report you are reading is the publication of the instance; the habitat is the reconstruction the package carries.

## 3. Axes

The home axis (`id: mesa`) is home. One can simply be there. Factual mode does not apply. Inventing facts, operator data and system capabilities remains prohibited.

Any other axis is work. With no generative verb, factual mode applies: only CANONICAL, MEMORY FACTS or SESSION HISTORY. If it is not there, the machine says exactly: *no lo tengo en el canon de este eje*.

The name of an axis may not resemble an environment marker.

RECORRIDO is map, not territory. Where the thread has been and how many turns. Zero content. Not narrated.

## 4. Three stores

**Identity** — the entity, global.

**Canon** — topics of the axis, verbatim. The clip and the imported file land here. `/remember` too. A canonical chain is canon. Admission of a document is all-or-nothing. Deduplication is by SHA-256 of the original body in that axis.

**Library** — material at hand (eight turns) or retrieved by lexical overlap. Not canon. Neither is the agenda.

If a work axis has no topics, there is abstention: facts of that domain are not invented. The habitat remains present.

## 5. The package

Thirteen blocks, in this order. Each declares its status on the first line. Markers are `### NAME ###`. Content cannot counterfeit a marker: `⟦⟧` becomes `‹›` and any `###…###` arriving inside content is wrapped.

| # | Block | What it is |
|---|---|---|
| 1 | RICK RUNTIME v9 | contract — the environment assembles, the model generates |
| 2 | IDENTIDAD | who. Empty is declared |
| 3 | RECORRIDO | map |
| 4 | DRIFT STATUS | drift of the thread |
| 5 | CANONICAL | habitat always; then the topics of the axis, entire |
| 6 | META | every twenty turns only; governance, not content |
| 7 | SESSION HISTORY | what was said and **admitted**, not truth. Five-turn window plus an extractive summary. No LLM judge. Rejected replies are not this section |
| 8 | REFERENTES | *el punto N* resolved against the last listing of the axis. If there is none, nothing is invented |
| 9 | MEMORY FACTS | hand, library by overlap (best two), upcoming agenda. If nothing: none |
| 10 | CONTEXTO 2 | signals from the previous turn. Read, not narrated |
| 11 | INSTRUCTIONS | home, factual or voice. VCE if there is a sample |
| 12 | INPUT | the turn, verbatim |
| 13 | FOCUS | the thesis the operator fixed, or the turn |

The contract: if a required block is missing, duplicated, empty, out of order, or if packing omitted a canonical block, there is no response. ABSTENCION, META, REFERENTES and CONTEXTO 2 may be absent.

Weights in the contract are UTF-8 byte lengths (`TextEncoder`), not `String.length`. `String.length` remains the unit only where the transport ceiling for a chat message is declared as 2 500 UTF-16 code units.

## 6. Governance

Before speaking: the spend lock, the engine lock, the writer lock, drift, contract, canon integrity, transport.

**Drift** — overlap of the thread. Low sample: observed, not cut. Continuity below 0.1: CRITICAL. It cuts until the operator acknowledges (`/drift`). It is persisted. Reload is not acknowledgment. The response does not enter.

**Contradiction** — only with negation or substitution, and lexical overlap. There is no LLM summary against canon.

**Admission / enforcer** — streaming is shown as provisional. Admission requires `stop = end_turn` and enforcer ≠ BLOCK. Empty, truncated, echo, repeated: not admitted. Abort, error, `max_tokens`: not admitted. The operator sees `[NO ADMITIDO]` as evidence. SESSION HISTORY and speech use only admitted replies.

**Engine** — the first model is the reference. If it changes, it cuts until `/motor`.

**Forget** — asks for confirmation, backs up the thread **and** the summary/cursor of this axis, touches neither canon nor identity nor the other axes. `/restaurar` returns that backup.

**Writer** — one tab writes. Another is a reader.

The sensor is alive: every evaluation is recorded, firing or not. An empty log means a dead sensor, never health.

## 7. Protocol

`/olvidar` `/restaurar` `/remember` `/canon` `/paquete` `/recorrido` `/focus` `/motor` `/drift` `/vce` `/candado` `/grabar` `/parar` `/agenda` `/cintas`

Voices: `/rick` `/entidad` `/espejo` `/acido` `/3am`

Clip = topic to the canon of this axis. Enter sends. Dictation fills the composer; Enter still sends.

Inspect exports and imports a capsule. It does not export keys.

## 8. Reconstruction

To raise another instance, this is needed and this suffices:

- the environment that assembles the package in the order of §5, with a status on every block
- global identity distinct from axis canon
- home axis as home and the rest factual except on a generative verb
- the absence sentence, literal
- lexical checking, no LLM judge
- session isolated per axis
- `/olvidar` with confirmation and backup of thread and summary
- this habitat injected always into CANONICAL
- a text generator that is not the state
- admission of a reply only after a valid termination and a non-BLOCK enforcer
- document identity from the original bytes
- a single writer on the origin

The rest — voices, agenda, tapes, keyboard, colour, the words on the chrome — is skin. It can change. The physics cannot.

## 9. Declared limits

- The state of whoever opens the link lives in one browser. Clearing site data destroys it. A capsule is the portable copy; it is not automatic sync.
- Selection is lexical plus what is at hand. A synonym nobody declared does not activate. This is the design, not a defect.
- The spend lock stops this screen. It does not make the published link private: whoever opens the link gets the machine, loads their own key, and spends against their own quota.
- The generation engine is a remote third party and is not fixed. Chat and voice run against the same motor only when that motor declares voice. A capability the chosen engine lacks is not offered and then failed; it is absent or `unknown` and declared. Response quality is not deterministic and is not governed by content: the enforcer judges form, never meaning.
- State is per browser. It is not shared between people, between devices, or between sessions in different browsers, and there is no server copy to reconcile them. Whoever opens the link operates their own instance. Two tabs on the same origin: one writer.
- The copy installed inside the Grok phone application is a snapshot of whenever it was downloaded. Git and Vercel do not refresh that copy. The Vercel origin identifies this revision with **actualizada** and the short object name.

## 10. What this is not

It is not the paper. It is not the entity. It is not a summary of the conversation. SESSION HISTORY is not established truth. MEMORY FACTS is not canon. CONTEXTO 2 is not recounted. The recorrido is not what was discussed. A provisional stream is not a reply. A partial historical package is not an exact package. If it is not in the sections, it is not asserted as fact.

The operator writes who. This text says where. The environment assembles. Rick speaks.

---

# Part II · What a refusal looks like

This part documents the refusals, because a report that claims a machine can refuse must show what the refusal is made of.

**Contract failure.** `validateContract` runs on the assembled system context before the request is built. It checks presence, cardinality one, UTF-8 weight > 0, allowed names only, and order. `turnMayCall` also requires `canonIntegral`, `transportOk`, writer, and the drift/motor pins. On failure the model is not called. The turn returns a block marker naming the violated contract.

The distinction that matters: the machine does not check that assembly ran. It checks that assembly produced the declared object. Those are different, and the difference is the mechanism.

**Drift critical.** Continuity is the lexical overlap of the last three turns against the previous three, over `[a-z0-9]{3,}` tokens, NFD-normalised. Below six turns or six content tokens the sensor abstains and says so — it does not report health, and it does not report drift. Below 0.1 continuity it is CRITICAL: the turn is cut and `driftBlocked` is set and persisted. It stays set until `/drift`. No timeout clears it, no subsequent coherent turn clears it, and no reload clears it.

**Admission block.** After the stream, termination is mapped (`stop` / `end_turn` → `end_turn`; `length` / `max_tokens` → `max_tokens`; error and abort as such). Only `end_turn` is a valid termination. The enforcer then evaluates form. On rejection the operator sees `[NO ADMITIDO]`. The text is not admitted, not spoken, not compacted, not injected as SESSION HISTORY.

Why acknowledgment rather than a timeout. A condition that clears itself teaches the operator that the alert was noise. A condition that requires a command makes the operator the one who resumes, and records that they did. This is the same asymmetry as the abstention rule: a sensor that declares its abstention makes an empty log unambiguous, and a gate that waits for a person makes a resumed conversation attributable.

---

# Part III · What it is like to operate a machine that refuses

The counter-hypothesis to this report is that a client which refuses turns is unusable. This part reports against that, and does so honestly: it is a single-operator account, not a study, and it is offered as such.

The refusals are rare and they are legible. In ordinary use the contract does not fail, because the sections that can be empty are declared optional and the ones that cannot be empty are the ones the machine always has. A contract failure means something structural broke, and when it fired it was because something structural had broken.

The drift break was the one that changed behaviour. Cutting the turn on a continuity break, and requiring a command to resume, converts a soft signal into a decision. The cost is real: a legitimate topic change reads as a rupture, and the operator has to acknowledge it. The benefit is that the thread never continues over a break without someone having said so. After the freeze, a reload no longer impersonated that command.

The engine pin fired on a real event. The reference model changed under the same request. The machine stopped rather than continuing against a different engine, and the operator acknowledged the change deliberately.

Admission of cut streams was added because a transport failure had been written as conversation. That is a defect the freeze machine had and this revision does not.

What is not claimed here. No comparison against a non-refusing configuration of the same machine, no second operator, no measurement of how often each gate fires over a fixed corpus. Those are what would turn this part from an account into evidence, and they are the obvious next work.

---

# Part IV · Positioning and related work

An adversarial search was run over academic indices, GitHub, project documentation, community forums and product directories. Its instruction was hostile: to refute each claim rather than confirm it. It succeeded in part against every mechanism of the freeze machine, and this part is written around what it found. It was still bounded — a limited query budget, no exhaustive sweep of Product Hunt or Show HN archives, no non-anglophone sources — so “not found” below means not found by that search, not non-existence. Amendments after `b1df8bb` were not re-attacked.

## 1. The assembled input as a validated contract

Validating what leaves for the model, rather than what comes back, is the least occupied position the search examined, and it is occupied in fragments.

Prompt contracts as a term exists [4][5], applied to output shape or as an authoring specification. Assembly frameworks maintain named sections in a declared order — Priompt composes under a token budget by dropping low-priority blocks [6]; POML gives prompts component-based markup with build-time validation [7]; DSPy signatures declare field order and warn on mismatch [8]. None asserts a fixed roster or refuses to proceed. Gateway guardrails run pre-call and can fail closed [9] — but they inspect content for injection, PII and jailbreak, not the structure of the assembled object.

The closest academic framing is a 2026 paper that formalises a control-state invariant: the policy must reach the decision state present, sound and correctly bound [10]. It states the property this machine enforces. It measures it; it does not abort on it.

What the search did not find is the three joined over the assembled input: a declared roster of named sections, a verified canonical order, and refusal of the call when either fails.

## 2. Abstention: the trigger, not the abstaining

Abstention in language models is a large and active field. A TACL survey organises it across query, model and human values [11]; AbstentionBench evaluates it over twenty datasets and finds that reasoning fine-tuning degrades it, scoring with an LLM judge [12]. Conformal methods trigger on calibrated confidence.

In all of it the decision to abstain derives from the model’s own uncertainty or from a second model’s judgement. Deterministic intent detection by morphosyntactic rules exists, in support routing rather than in abstention [13].

This machine abstains on grammar. A closed, declared set of generative verbs decides whether the turn is generative or factual, and in factual mode with no canon the absence is stated in a fixed sentence. Nothing about the model’s confidence enters the decision. That inversion — a lexical, auditable, operator-inspectable trigger for a behaviour the field triggers on confidence — is the claim.

## 3. Epistemic status inside the prompt

Labelling the provenance and reliability of retrieved material is well developed. Credibility-aware frameworks score sources before generation [14]; interfaces annotate spans of a trace by confidence [15]; and epistemic framing of prompts is taught explicitly, separating what is context from what is the mode of reasoning, with checkable constraints [16].

These label retrieved chunks, or annotate the output, or frame the task. The search found none where every section of the assembled system prompt opens with a status drawn from a closed taxonomy, such that the model receives, declared, that the session history it is reading is not established truth and the memory it is reading is not canon. The claim is that per-section typing, as part of the contract.

## 4. The summary as something to be validated

Extractive summarisation for context windows exists [17]. Deterministic memory management that invokes no model exists and argues explicitly against generative compression on grounds of non-determinism and cost [18]. Separating the extraction of evidence from the execution of the answer policy is published [19]. Closest of all, a write-time admission gate exists: before committing a candidate fact to memory it asks the model K times for a support score and admits only above a threshold [32]. The position is the same as the one this machine occupies; the decision procedure is not.

What the search found in every deployed compaction it checked is that a model writes the summary, and that no system validates the new summary against the previous one before accepting it. This instance’s gate scores the candidate against **canon**, keeps the earlier summary on rejection, and does not advance the compaction cursor. The freeze report had described the comparison target as the previous summary; the code did not. This document follows the code.

## 5. The silent engine swap

That providers change models under stable names is documented, and the field’s response is documented with it: pin the version, and run canaries and continuous evaluations to detect drift [20][21]. Runtime verification that the loaded model is the expected one is done in practice [22].

Every one of those detects and reports. This machine halts and requires `/motor` ack. The claim is the response, not the detection.

## 6. Deterministic gates over the turn

Detecting degenerate output deterministically — repeated n-grams, tail loops, distinct-token ratios against a threshold — is published work [23][24][25]. Circuit breakers over agent turns are an established pattern with loop detection [26]. Guardrail frameworks include non-model validators, though their fact-checking and hallucination rails typically invoke a model.

The detectors here are not novel and are not claimed. What the search did not find is the arrangement: deterministic gates at the points of one turn — refusing before the call is spent, discarding the generated response so it never enters the thread as conversation — with no gate clearing itself. The live machine adds an explicit admission of transport termination before the enforcer is allowed to treat the buffer as a reply.

## 7. Numeric anaphora — prior art, cited as such

Resolving *el punto 3* against the last numbered listing, locally and without a model call, is implemented in this machine and is not claimed. Pronominal anaphora resolution by algorithm dates to 1994 [1]. Numeric fused-head identification and resolution has had a definition, a dataset and models since 2019 [2]. Non-LLM reference resolvers serve as the comparison baselines in current work [3].

The mechanism is described in Part I because it is part of the machine. It is placed here because it belongs to the field.

## 8. The pattern the search did not find

Seven mechanisms were attacked. For all seven the generic component was found. The field has all of it.

In six of the seven the same element was missing from every antecedent. The prior art detects, measures, scores, annotates, logs and alerts. It does not stop the turn, and it does not wait for a person. Pinning is advice, not a halt. Drift detection emits an alert, not a block. Provenance labelling annotates the answer, not the contract. Guardrails that fail closed check content, not structure.

This machine’s position is the other one: a declared contract, a deterministic gate, a halt, and an operator command to resume. Whether that position is correct is a design question this report does not settle — Part III reports one operator’s account and no more. Whether it is occupied is an empirical question, and the search says it is not.

## 9. Relation to the runtime and to prior work of this author

This machine is an instance of the architecture reported in [27], on a different substrate. It carries neither the entity nor the version chains nor the enforcer’s semantic layer of that system. The deterministic-governance framing it shares with a 2026 literature — formal governance of contextual space, deterministic memory pipelines, pre-call per-turn drift sensors, deterministic assembly against a fixed budget, and a deterministic control plane for coding agents — is cited in [18][28][29][30][31], and priority on everything those state is theirs.

---

## References

Sources 1, 2, 3, 6, 7, 8, 10, 11, 12, 18, 19, 23, 24, 25, 27, 28–31 and 32 are pinned. The remainder are cited by class or by product documentation and are marked as such; before submission to any venue with review each must be pinned to a specific document with a retrieval date, under the same rule this report applies to everything else: a claim that cannot be pinned to a source is removed, not softened.

1. S. Lappin, H. J. Leass. *An Algorithm for Pronominal Anaphora Resolution.* Computational Linguistics 20(4):535–561, 1994. — Part IV §7.

2. Y. Elazar, Y. Goldberg. *Where’s My Head? Definition, Dataset and Models for Numeric Fused-Heads Identification and Resolution.* TACL 7:519–535, 2019. arXiv:1905.10886. — Part IV §7.

3. J. Moniz, S. Krishnan, M. Ozyildirim et al. *ReALM: Reference Resolution As Language Modeling.* Apple, arXiv:2403.20329, 2024. Non-LLM resolvers as baseline. — Part IV §7.

4. Prompt-contract formulations in practitioner literature (structured prompt specification with sections, invariants and scope). *Cited by class.* — Part IV §1.

5. Inference-contract formulations in practitioner literature. *Cited by class.* — Part IV §1.

6. Priompt. github.com/anysphere/priompt. Priority-based prompt composition under a token budget. — Part IV §1.

7. Y. Zhang, S. Chen, Y. Xu, Y. Yang. *POML: Prompt Orchestration Markup Language.* Microsoft Research, arXiv:2508.13948, 2025. — Part IV §1.

8. DSPy signatures — declared field order with warnings on mismatch. dspy.ai. — Part IV §1.

9. Pre-call gateway guardrails with fail-closed policy (LiteLLM prompt security hooks; TrueFoundry inference hooks; Arthur pre-LLM guardrails). *Cited by class.* — Part IV §1.

10. *Ghost in the Context: Policy-Carriage Integrity in LLM Agents.* arXiv:2605.12535, 2026. — Part IV §1.

11. B. Wen, J. Yao, S. Feng, C. Xu, Y. Tsvetkov, B. Howe, L. L. Wang. *Know Your Limits: A Survey of Abstention in Large Language Models.* TACL 13:529–556, 2025. arXiv:2407.18418. — Part IV §2.

12. P. Kirichenko, M. Ibrahim, K. Chaudhuri, S. Bell. *AbstentionBench: Reasoning LLMs Fail on Unanswerable Questions.* Meta, arXiv:2506.09038, 2025. — Part IV §2.

13. Linguistics-based deterministic intent detection in conversational agents. Information Sciences, 2024. — Part IV §2.

14. Credibility-aware retrieval-augmented generation frameworks. *Cited by class.* — Part IV §3.

15. *RAGTrace: Understanding and Refining Retrieval-Generation Dynamics in Retrieval-Augmented Generation.* arXiv:2508.06056, 2025. Confidence annotation of trace spans. — Part IV §3.

16. Epistemic framing of prompt components (context versus frame, with explicit checkable constraints). Carnegie Mellon University Libraries, LLM Documentation Guide. — Part IV §3.

17. Extractive summarisation applied to context compression for language models. *Cited by class.* — Part IV §4.

18. *DMF: A Deterministic Memory Framework for Conversational AI Agents.* arXiv:2606.03463, 2026. — Part IV §4, §9.

19. V. Reddy, S. R. Challaram. *Reliable Post-Retrieval Assembly for Agent Memory: Separating Evidence Extraction from Policy Execution.* arXiv:2606.01435, 2026. — Part IV §4.

20. Silent model-update disclosure practices across providers. *Cited by class.* — Part IV §5.

21. Model-pinning policy and canary-based swap detection in production practice. *Cited by class.* — Part IV §5.

22. Runtime verification of the served model identity (issue reports in agent projects). *Cited by class.* — Part IV §5.

23. *On the Robustness of Knowledge Editing for Detoxification.* arXiv:2602.10504, 2026. Per-token degeneration detection, repeated n-grams, tail loops. — Part IV §6.

24. *LLM Watermark Evasion via Bias Inversion.* arXiv:2509.23019, 2025. Distinct-unigram ratio with threshold. — Part IV §6.

25. *Breaking the Loop: Detecting and Mitigating Denial-of-Service Vulnerabilities in Large Language Models.* arXiv:2503.00416, 2025. — Part IV §6.

26. Circuit-breaker patterns for agentic systems, with loop detection over action sequences. *Cited by class.* — Part IV §6.

27. D. G. Impieri. *RICK Runtime v9: Deterministic Context Governance and Identity Persistence for an Entity in a Language Model.* Zenodo, 2026. Concept DOI 10.5281/zenodo.22591393, which always resolves to the latest version. — the architecture this machine instantiates.

28. *Context Cartography: Toward Structured Governance of Contextual Space in Large Language Model Systems.* arXiv:2603.20578, 2026. — Part IV §9.

29. *Nautilus Compass: Black-box Persona Drift Detection for Production LLM Agents.* arXiv:2605.09863, 2026. Deterministic, pre-call, per user turn. — Part IV §9.

30. *Context Recycling for Long-Horizon LLM Inference.* arXiv:2606.26105, 2026. — Part IV §9.

31. P. Madatha. *A Deterministic Control Plane for LLM Coding Agents.* arXiv:2606.26924, 2026. — Part IV §9.

32. Y. Zhang, S. Li. *ConsistencyGate: Preventing Memory Contamination in LLM Agents via Self-Consistency.* arXiv:2607.22962, 2026. Write-time admission gate; admits a candidate fact when the average of K model support scores exceeds a threshold. — Contributions §3, Part IV §4.

---

*Rick App · an instance of RICK Runtime v9 · Browser, TanStack Start, zustand persist · Code at github.com/yunusdim/rick-app, freeze `b1df8bb`, live parent `f8e6465`, chrome marker **actualizada** · The live code in the repository is the authority; this document confronts it, never the reverse.*
