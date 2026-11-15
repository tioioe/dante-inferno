// Ricava assets/dante.glb dal rig CC0 "Universal Animation Library" (Quaternius): tiene scheletro, manichino (nascosto da dante.js)
// e solo le animazioni che servono, con i nomi che usa il gioco (Idle, Walk, Run…).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, resample, prune } from '@gltf-transform/functions';
const SRC = 'assets_download/ual/x/Animation Library[Standard]/Godot/AnimationLibrary_Godot_Standard.glb';
const MAP = { Idle_Loop: 'Idle', Walk_Loop: 'Walk', Jog_Fwd_Loop: 'Run', Sprint_Loop: 'Sprint', Death01: 'Death', Hit_Chest: 'HitReact', Punch_Cross: 'Punch', Sword_Attack: 'Sword', Roll: 'Roll' };
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(SRC);
for (const a of doc.getRoot().listAnimations()) { const n = MAP[a.getName()]; if (n) a.setName(n); else { for (const c of a.listChannels()) { const sm = c.getSampler(); c.dispose(); if (sm) sm.dispose(); } a.dispose(); } }
for (const t of doc.getRoot().listTextures()) t.dispose();   // il manichino resta nascosto: niente texture
for (const m of doc.getRoot().listMeshes()) for (const pr of m.listPrimitives()) for (const sem of pr.listSemantics()) if (/^(NORMAL|TANGENT|TEXCOORD|COLOR)/.test(sem)) pr.setAttribute(sem, null);   // invisibile: bastano posizioni e pesi
await doc.transform(dedup(), resample(), prune());
await io.write('assets/dante.glb', doc);
console.log('animazioni:', doc.getRoot().listAnimations().map(a => a.getName()).join(', '));
