# Prototype Design Doc v2 — Working Title: TBD

## Purpose of this prototype

This is **not** a vertical slice of the full game. It exists to validate one hypothesis:

> Low-APM combat (auto-attack + infrequent, impactful abilities) frees enough player attention that coop encounters produce genuine "I saved you / you enabled me" moments — and that this stays interesting past the first time.

Everything not required to test that is explicitly out of scope. Placeholder art, primitive shapes, and debug UI are expected and fine.

**Build order:** solo combat feel → two-player Charger encounter → (only if that passes) boss encounter.

**The prototype is disposable.** Its only output is an answer to the hypothesis above.

---

## Framing note: what the bet actually is

Auto-attack + positioning + a few long-cooldown decisive abilities is, structurally, MOBA laning. That verb has proven durability, but a large part of why it works is that there is a *human opponent* thinking about you. PvE games using this verb usually compensate with density, spectacle, and loot — all of which are out of scope here.

This design substitutes something different: it moves the unpredictable human from the enemy side to the **ally** side. The bet is that watching an ally is engaging the way watching an opponent is.

Two consequences follow, and they should shape how results are read:

- Solo will feel flat. That is a *prediction of the design*, not evidence against it. Nothing unpredictable is present in Stage 1.
- The whole thing hinges on ally-facing moments having real decision content. If they're scripted, the verb collapses into a rotation. This is why Stage 2 is restructured below.

---

## Scope

### In scope
- Isometric 3D, fixed camera angle
- 1–2 players networked
- Click-to-move / click-to-attack (see Input model)
- Auto-attack
- 3 abilities per character on cooldowns
- 2 character archetypes with distinct roles
- 3 enemy types
- **Downed state + revive**
- Telegraph system for enemy attacks
- Debug UI: health, cooldowns, damage numbers, incoming-telegraph timers, **per-run event log** (see Instrumentation)

### Out of scope
- Progression, loot, stats, inventory, skill trees
- Hub / town
- Procedural generation
- AI Director
- Multiple zones or difficulty tiers
- Weapon swapping
- Art, animation polish, audio beyond basic hit/cast feedback
- Menus, save systems, matchmaking

---

## Core combat loop

### Input model (resolved — this was contradictory in v1)

**One model, pick it and build it:**

- **Right-click** = contextual move/attack, Dota-style. Clicking ground moves; clicking an enemy sets it as the attack target.
- **Auto-attack is automatic.** When idle and a valid target is in range, the character attacks on a fixed interval. Nearest target by default; manual click overrides target priority.
- **No hard root.** The player is never locked in place.
- **Each swing has a short wind-up (~0.3s).** Issuing a move order during wind-up *cancels the swing and forfeits the damage.*

That last rule is what preserves the safety-vs-output tension without the stickiness of a movement lock. The cost of repositioning is a lost swing, not a lost half-second of control. This is the recommended default; a hard root remains a cheap A/B to try if the tension reads as too weak.

**On click-to-move (decision made: keep it).** The accessibility argument wins — the design goal is a game that is easy to *operate* so attention can go elsewhere, and Dota/League demonstrate that mouse-driven movement coexists fine with dodging telegraphed ground effects and tracking allies. In practice players click near their own character, so it's peripheral vision, not eyes-off-screen.

The specific thing to watch, because it's where click-to-move is genuinely weakest: **the Frontliner orbiting to a boss's flank.** Melee circle-strafing via discrete click orders is the known clunky case. If flanking the cleave feels like fighting the controls rather than fighting the boss, that's the signal — and the fix is likely a directional-input fallback for melee, not abandoning the scheme. Abstract the input layer far enough that WASD is an afternoon's work if needed.

### Movement as the primary moment-to-moment skill

Movement must carry real decision weight. Three things it needs to do:

1. **Avoid encirclement** — being surrounded by melee enemies is a losing state, so spacing matters
2. **Dodge slow projectiles** — telegraphed, travel-time projectiles avoidable by moving, not by reflex
3. **Maintain auto-attack uptime** — repositioning forfeits swings, so there's a real tension between safety and output

If movement doesn't create these three tensions, the atom has failed.

### Abilities
- 3 per character
- Long cooldowns (start at 12s, tune aggressively — this is where the feel lives)
- Each ability should be **decisive**, not incremental
- Categories across the two archetypes: damage burst, crowd control, protection

---

## Archetypes

### Archetype A — "Frontliner"
- High health, melee auto-attack range
- **Fissure** — slams the ground in a line, damaging and stunning enemies hit; the path leaves impassable craters briefly
- **Hook** — grab an enemy and pull yourself to it (target stunned, self shielded). Targeting an *ally* drags them to you and shields them
- **Slam** — ground slam around self: damage, stun, and a heal to self and nearby allies

Deliberately **not** self-sufficient against heavy attacks. No dodge, no escape. Survives via angle, not distance, plus teammate intervention.

### Archetype B — "Support/Ranged"
- Low health, long auto-attack range
- **Stun/Root** — interrupts an enemy cast or locks it in place
- **Shield** — absorb shield on an ally (cannot self-cast, or heavily reduced on self)
- **Reposition** — short blink for self-preservation

If the Support ignores its teammate and just DPSes, encounters should fail.

---

## Enemies

### 1. Swarmer (melee chaff)
Low health, fast, spawns in groups of 5–10, short melee windup.
*Purpose:* creates the encirclement pressure that makes movement matter.

### 2. Lobber (ranged)
Medium health, slow/stationary, slow arcing projectile with ground indicator, ~1.2s travel.
*Purpose:* dodgeable threat that punishes standing still.

### 3. Charger (telegraphed heavy) — **promoted to primary test subject**
High health, slow, telegraphs a linear charge (~1.5s windup, visible line). Interruptible by Support's stun. Damage high enough to matter — a connected charge should down a Frontliner at moderate health, not chip it.
*Purpose:* **this enemy is the hypothesis.** "Teammate intervention prevents a hit you couldn't avoid alone" is the entire thesis, and the Charger delivers it at roughly a tenth the build cost of a boss.

---

## Stage 2 — the real test (Charger encounters)

Build this before any boss. A boss will not rescue a thesis the Charger disproves.

### Making the save a decision, not a script

A single Charger interrupt tested in isolation is a reflex check with one right answer. It will feel great once and become a rotation by the tenth repetition. The interesting version requires **opportunity cost** — the Support must give something up to make the save. Build encounters that force this:

- **Two threats, one stun.** A Charger winds up on the Frontliner while a second Charger or a Lobber volley threatens the Support. One stun, two uses. That is a judgment call, and it's a different judgment each time depending on health states.
- **Range as a cost.** The stun's range is short enough that saving the Frontliner sometimes requires the Support to step into Swarmer contact range. Safety traded for the save.
- **Cooldown as a cost.** With a 12s stun cooldown and Chargers arriving every ~8s, the Support must decide which charges are worth spending on — implying some hits are *meant* to be eaten.

Encounter set to build (arena, no procedural generation):
1. Charger + Swarmers — baseline single save
2. Two Chargers, staggered — one stun, two threats
3. Charger + Lobbers pressuring the Support — the range/safety trade

### Downed state

Failure should not be binary death. On lethal damage, a player enters a **downed** state: immobile, unable to act, on a bleed-out timer, revivable by the teammate over a short channel.

This does two jobs. It makes the counterfactual *legible* — you can see the exact moment you failed to help, which is what turns a mistake into a lesson. And it gives a second, slower rescue verb (revive) to compare against the fast one (interrupt), which is useful data on which kind of rescue actually carries the emotional weight.

---

## Stage 3 — boss encounter (build only if Stage 2 passes)

Unchanged in intent from v1, but gated. Boss kit:

1. **Frontal cleave** — wide cone, ~1s telegraph. Counterplay: positional, move to flank/rear
2. **Ground pound** — expanding ring, ~1.5s telegraph. Counterplay: distance
3. **Execute** — long ~2.5s telegraph, lethal to a full-health Frontliner. Counterplay: Support interrupt or shield
4. **Adds phase** — at 60% and 30%, spawns Swarmers, boss briefly invulnerable

**Apply the opportunity-cost fix to Execute as well.** As written in v1, Execute always targets the Frontliner with the same answer every time — a scripted check. Make it contested: Execute overlaps with an adds wave, or targets whoever is highest-threat rather than always the tank, or its telegraph overlaps a ground pound so the Support must resolve its own survival *and* the save in the same window.

---

## Telegraph system (critical, not polish)

- **Spatially legible** — ground decals showing the exact affected area
- **Temporally legible** — the decal fills over the windup so players read *when*, not just *where*
- **Readable at a glance** — a player watching a teammate must parse an incoming threat on that teammate without looking away from their own character
- **Distinct per threat type** — different color/shape language for "move out of this" vs "this must be interrupted"

The last two are what make coop reaction possible at all.

---

## Pass criteria

### Stage 1 — Solo (prerequisite only)

Solo is **expected to feel quiet.** Do not tune it to be maximally exciting; that consumes the attention headroom the whole design depends on.

- [ ] Does avoiding encirclement involve real decisions?
- [ ] Do slow projectiles create readable, satisfying dodge windows?
- [ ] Does manual target priority matter?
- [ ] Does landing an ability at the right moment feel weighty?

Four yeses → proceed even if the overall feel is calm.

### Stage 2 — Two players (the hypothesis)

**First-impression criteria** (necessary, not sufficient — nearly any design passes these once):
- [ ] Does a successful interrupt/shield produce an audible reaction?
- [ ] Do players naturally start watching each other's health and telegraphs?
- [ ] Do players discuss or plan between attempts?

**Durability criteria** (this is the real bar):
- [ ] After 10+ runs of the same encounter, are the save decisions still live — or has it become a solved sequence executed from memory?
- [ ] Do failures feel like *judgment* errors ("I spent the stun wrong") rather than *execution* errors ("I clicked late")?
- [ ] Does the two-Charger encounter produce different choices on different runs?

If the first-impression criteria pass but durability fails, the verb is a novelty, not a game. That is the outcome most worth detecting, and it's the one a short playtest will hide.

### Self-testable vs. requires other people

Two clients on one machine is the daily loop and covers most of this. But **self-testing a coop game produces systematically biased data** — one brain driving both characters knows every telegraph and coordinates perfectly, so everything reads as more legible and better-tuned than it will be for two strangers.

Cannot be self-tested — needs two outside people, once, before drawing conclusions:
- [ ] Do players *naturally* start watching each other, without being told to?
- [ ] Do two uncoordinated players reliably fail?
- [ ] Are telegraphs legible to someone who did not design them?

Everything else can be evaluated solo across two clients.

### Instrumentation

Log per run: stun casts (target, timing relative to nearest telegraph), downs, revives, deaths, Charger hits taken vs. interrupted, ability uptime. The durability question is hard to answer from feel alone — if run 10's stun timings are near-identical to run 3's, that's a solved sequence regardless of how it felt.

---

## Open questions (decide during implementation, record the choice)

1. **Swing-cancel vs. hard root** — start with swing-cancel-on-move; A/B a 0.3s root if the safety/output tension reads as weak
2. **Ability cooldown length** — start at 12s. Too short → rotation game. Too long → helplessness between casts
3. **Can Support solo-survive?** Support has Reposition, Frontliner has no escape. Verify this asymmetry reads as intentional rather than unfair
4. **Revive channel duration** — long enough that reviving is a real commitment under pressure, short enough that a wipe isn't guaranteed
5. **Does click-to-move hold up for melee flanking?** See Input model. Watch this specifically; don't let it silently degrade the Frontliner

---

## Explicit non-goals

Do not build toward the full game. Do not add progression "since it's easy." Do not build the hub. Do not build the AI Director. Do not generalize systems for future content. Do not build the boss until Stage 2 passes.

*(This section was the strongest part of v1 and is the part most likely to be violated. Leave it in.)*
