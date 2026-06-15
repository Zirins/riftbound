// scripts/test-offline-energy.mjs
// Simulates Hub load + offline claim energy flow (no browser).

const OFFLINE = {
  MIN_HOURS_TO_TRIGGER: 2,
  MAX_HOURS: 12,
  GOLD_PER_HOUR: 500,
  XP_PER_HOUR: 5,
  ENERGY_PER_HOUR: 3,
};

const ENERGY = {
  MAX: 150,
  REGEN_PER_MINUTE: 1,
};

const SIX_HOURS_MS = 6 * 3_600_000;

function computeHoursOffline(lastOnlineAt, now) {
  return Math.max(0, (now - lastOnlineAt) / 3_600_000);
}

function computeRewardAmounts(hoursOffline) {
  if (hoursOffline < OFFLINE.MIN_HOURS_TO_TRIGGER) {
    return { eligible: false, hoursCredited: 0, energy: 0 };
  }
  const hoursCredited = Math.min(hoursOffline, OFFLINE.MAX_HOURS);
  return {
    eligible: true,
    hoursCredited,
    energy: Math.floor(hoursCredited * OFFLINE.ENERGY_PER_HOUR),
  };
}

function preview(save, now) {
  const hoursOffline = computeHoursOffline(save.offlineRewardState.lastOnlineAt, now);
  return { hoursOffline, ...computeRewardAmounts(hoursOffline) };
}

function syncOnHubLoad(save, now) {
  const p = preview(save, now);
  if (p.eligible) {
    save.offlineRewardState.pendingEnergy = p.energy;
    save.inventory.lastEnergyRegenAt = now;
    return p;
  }
  save.offlineRewardState.pendingEnergy = 0;
  save.offlineRewardState.lastOnlineAt = now;
  return p;
}

function computeRegen(save, now) {
  const maxEnergy = save.inventory.maxEnergy ?? ENERGY.MAX;
  if (save.inventory.energy >= maxEnergy) {
    save.inventory.lastEnergyRegenAt = now;
    return;
  }
  const elapsedMs = now - save.inventory.lastEnergyRegenAt;
  const regenPerMs = ENERGY.REGEN_PER_MINUTE / 60_000;
  const gained = Math.floor(elapsedMs * regenPerMs);
  if (gained <= 0) return;
  const newEnergy = Math.min(maxEnergy, save.inventory.energy + gained);
  const consumed = newEnergy - save.inventory.energy;
  const msConsumed = consumed / regenPerMs;
  save.inventory.energy = newEnergy;
  save.inventory.lastEnergyRegenAt = save.inventory.lastEnergyRegenAt + msConsumed;
}

function claim(save, now) {
  const grant = save.offlineRewardState.pendingEnergy;
  const maxEnergy = save.inventory.maxEnergy ?? ENERGY.MAX;
  save.inventory.energy = Math.min(maxEnergy, save.inventory.energy + grant);
  save.offlineRewardState.pendingEnergy = 0;
  save.offlineRewardState.lastOnlineAt = now;
  save.inventory.lastEnergyRegenAt = now;
}

function simulateHubLoad(save, now) {
  const offlineEligible = preview(save, now).eligible;
  if (!offlineEligible) computeRegen(save, now);
  syncOnHubLoad(save, now);
}

const now = Date.now();
const offlineAt = now - SIX_HOURS_MS;

const save = {
  inventory: { energy: 50, maxEnergy: 150, lastEnergyRegenAt: offlineAt },
  offlineRewardState: { lastOnlineAt: offlineAt, pendingEnergy: 0 },
};

const beforeHub = save.inventory.energy;
simulateHubLoad(save, now);
const afterHubBeforeClaim = save.inventory.energy;
const pendingEnergy = save.offlineRewardState.pendingEnergy;
claim(save, now);
const afterClaim = save.inventory.energy;
simulateHubLoad(save, now + 1_000);
const afterReload = save.inventory.energy;

const regenOnlySixHours = Math.min(150, 50 + Math.floor(SIX_HOURS_MS * (ENERGY.REGEN_PER_MINUTE / 60_000)));
const offlineOnlySixHours = Math.min(150, 50 + 6 * OFFLINE.ENERGY_PER_HOUR);

console.log('=== Offline energy double-grant test (6h, start 50/150) ===');
console.log(`before Hub load:            ${beforeHub}`);
console.log(`after Hub load (pre-claim): ${afterHubBeforeClaim}`);
console.log(`pending offline energy:      ${pendingEnergy}`);
console.log(`after claim:                 ${afterClaim}`);
console.log(`after hard reload:           ${afterReload}`);
console.log('--- reference ---');
console.log(`regen-only for 6h would be:  ${regenOnlySixHours}`);
console.log(`offline-only for 6h would be: ${offlineOnlySixHours}`);
console.log(`double-grant bug present:    ${afterClaim > offlineOnlySixHours}`);
