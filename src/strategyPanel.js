import { getVar } from "./gameInterface.js";
import WindowManager from "./windowManager.js";

const panel = document.createElement("section");
Object.assign(panel.style, { position: "fixed", right: "12px", top: "12px", zIndex: "10000", width: "min(320px, calc(100vw - 24px))", maxHeight: "70vh", overflow: "auto", padding: "10px", color: "white", background: "rgba(8, 12, 18, .92)", border: "1px solid rgba(255,255,255,.35)", borderRadius: "4px", font: "13px system-ui", pointerEvents: "auto" });
const title = document.createElement("strong");
title.textContent = "Meow: Strategy";
const content = document.createElement("div");
const targetSelect = document.createElement("select");
targetSelect.setAttribute("aria-label", "Attack estimate target");
Object.assign(targetSelect.style, { maxWidth: "100%", margin: "4px 0", display: "block" });
let selectedTargetId = null;
let mapReader = null;
targetSelect.addEventListener("change", () => { selectedTargetId = Number(targetSelect.value); });
function settingNumber(key, fallback, min, max, step) {
  const input = document.createElement("input");
  input.type = "number"; input.min = String(min); input.max = String(max); input.step = String(step);
  input.value = String(window.__fx?.settings?.[key] ?? fallback);
  input.style.width = "58px";
  input.addEventListener("change", () => {
    const value = Math.min(max, Math.max(min, Number(input.value) || fallback));
    input.value = String(value);
    window.__fx.settings[key] = value;
    localStorage.setItem("fx_settings", JSON.stringify(window.__fx.settings));
  });
  return input;
}
function settingCheckbox(key, text) {
  const label = document.createElement("label"); label.style.display = "block";
  const input = document.createElement("input"); input.type = "checkbox";
  input.checked = !!window.__fx?.settings?.[key];
  input.addEventListener("change", () => {
    window.__fx.settings[key] = input.checked;
    localStorage.setItem("fx_settings", JSON.stringify(window.__fx.settings));
  });
  label.append(input, ` ${text}`); return label;
}
const controls = document.createElement("div");
Object.assign(controls.style, { borderBottom: "1px solid rgba(255,255,255,.25)", paddingBottom: "8px", marginBottom: "8px" });
const autoTitle = document.createElement("div"); autoTitle.textContent = "Auto strategy"; autoTitle.style.fontWeight = "bold";
controls.append(autoTitle, settingCheckbox("autoStrategyEnabled", "enable automatic opening"), settingCheckbox("autoStrategyExpandEnabled", "expand every"));
const scheduleInput = document.createElement("input");
scheduleInput.type = "text"; scheduleInput.value = window.__fx?.settings?.autoStrategyTickSchedule || "26:7,31:8,33:7,28+36:7";
scheduleInput.title = "percentage(s):ticks, comma separated";
scheduleInput.style.width = "100%";
scheduleInput.addEventListener("change", () => {
  window.__fx.settings.autoStrategyTickSchedule = scheduleInput.value.trim();
  localStorage.setItem("fx_settings", JSON.stringify(window.__fx.settings));
});
const autoRow = document.createElement("div"); autoRow.style.lineHeight = "1.8";
autoRow.append("tick schedule (percent:ticks)", scheduleInput);
controls.append(autoRow);
panel.append(title, controls, content);
const windowElement = WindowManager.create({ name: "strategyPanel", classes: "strategy-panel" });
windowElement.append(panel);
windowElement.style.position = "fixed";
windowElement.style.inset = "0";
windowElement.style.zIndex = "10000";
windowElement.style.pointerEvents = "none";
panel.style.pointerEvents = "auto";

function getBorderPlayers(self, width, height, owner) {
  if (!owner || !width || !height || self < 0) return null;
  const border = new Set();
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const cell = y * width + x;
    if (owner(cell) !== self) continue;
    for (const neighbor of [cell - 1, cell + 1, cell - width, cell + width]) {
      const rival = owner(neighbor);
      if (rival >= 0 && rival !== self) border.add(rival);
    }
  }
  return border;
}
function number(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; }
function format(value) { return Math.round(number(value)).toLocaleString(); }
function heading(text) { const el = document.createElement("h3"); el.textContent = text; Object.assign(el.style, { margin: "10px 0 4px", fontSize: "14px" }); return el; }
function line(text) { const el = document.createElement("div"); el.textContent = text; el.style.padding = "2px 0"; return el; }
function makePlayers(names, balances, territories, self, borderPlayers = null) {
  return Array.from({ length: Math.max(names.length, balances.length, territories.length) }, (_, id) => ({ id, name: String(names[id] || `Player ${id + 1}`), troops: number(balances[id]), land: number(territories[id]) }))
    .filter(player => player.id !== self && player.land > 0 && (borderPlayers === null || borderPlayers.has(player.id)));
}
let autoStarted = false;
let autoPhase = 0;
let autoLastTick = null;
let autoLastGameState = 0;
let autoStoppedForEmpty = false;
function parseSchedule(value) {
  return String(value || "26:7,31:8,33:7,28+36:7").split(",").map(entry => {
    const [percentages, tick] = entry.trim().split(":");
    const values = percentages.split("+").map(Number).filter(value => Number.isFinite(value) && value >= 0 && value <= 100);
    return { values, tick: Math.max(0, Math.min(9, Number(tick))) };
  }).filter(entry => entry.values.length && Number.isFinite(entry.tick));
}
function getCurrentTick() {
  const value = Number(window.__fx?.currentTick);
  return Number.isFinite(value) ? Math.max(0, Math.min(9, value)) : null;
}
function hasEmptyLand() {
  if (typeof mapReader?.hasEmptyLand === "function") return !!mapReader.hasEmptyLand();
  if (typeof mapReader?.owner !== "function" || !mapReader.width || !mapReader.height) return null;
  for (let cell = 0; cell < mapReader.width * mapReader.height; cell++) {
    if (Number(mapReader.owner(cell)) < 0) return true;
  }
  return false;
}
function runAutoStrategy(settings, gameState, tickOverride = null) {
  if (!settings.autoStrategyEnabled || !gameState || typeof window.__fx?.keybindFunctions?.setAbsolute !== "function") {
    autoStarted = false; autoPhase = 0; autoLastTick = null; autoStoppedForEmpty = false; return "off";
  }
  const schedule = parseSchedule(settings.autoStrategyTickSchedule);
  const tick = tickOverride === null ? getCurrentTick() : tickOverride;
  if (!schedule.length || tick === null) return "waiting for game tick";
  if (gameState !== autoLastGameState) {
    autoLastGameState = gameState; autoStarted = false; autoPhase = 0; autoLastTick = tick; autoStoppedForEmpty = false;
  }
  if (!hasEmptyLand()) { autoStoppedForEmpty = true; return "stopped: no empty land"; }
  if (autoStoppedForEmpty) return "stopped: no empty land";
  if (!autoStarted) {
    autoPhase = 0;
    autoStarted = true;
    autoLastTick = tick;
    const values = schedule[autoPhase].values;
    if (values.length !== 1) return `${values.join("+")}% | ${tick}t (unsupported multi-action)`;
    window.__fx.keybindFunctions.setAbsolute(values[0] / 100);
    return `${values.join("+")}% | ${tick}t`;
  }
  if (!settings.autoStrategyExpandEnabled) {
    const values = schedule[autoPhase].values;
    return `${values.join("+")}% | ${tick}t (holding)`;
  }
  const wrapped = autoLastTick !== null && tick < autoLastTick;
  const target = schedule[autoPhase].tick;
  if (tick === target && autoLastTick !== target && (wrapped || tick > autoLastTick || target === 0)) {
    autoPhase = (autoPhase + 1) % schedule.length;
    const values = schedule[autoPhase].values;
    if (values.length === 1) window.__fx.keybindFunctions.setAbsolute(values[0] / 100);
    autoLastTick = tick;
    return values.length === 1 ? `${values.join("+")}% | ${tick}t` : `${values.join("+")}% | ${tick}t (unsupported multi-action)`;
  }
  autoLastTick = tick;
  const values = schedule[autoPhase].values;
  return `${values.join("+")}% | ${tick}t`;
}
window.__fx = window.__fx || {};
window.__fx.autoStrategyTick = (tick) => runAutoStrategy(window.__fx.settings || {}, Number(getVar("gameState")) || 0, tick);
function render() {
  const settings = window.__fx?.settings || {};
  const enabled = settings.showThreatPanel || settings.showAttackEstimate || settings.autoStrategyEnabled;
  WindowManager.setWindowVisible("strategyPanel", !!enabled && !!getVar("gameState"));
  if (!enabled) return;
  content.replaceChildren();
  const autoState = runAutoStrategy(settings, Number(getVar("gameState")) || 0);
  if (settings.autoStrategyEnabled) content.append(heading("Auto strategy"), line(autoState));
  const names = getVar("rawPlayerNames") || [], balances = getVar("playerBalances") || [], territories = getVar("playerTerritories") || [], self = Number(getVar("playerId"));
  const borderPlayers = getBorderPlayers(self, mapReader?.width, mapReader?.height, mapReader?.owner);
  const rivals = makePlayers(names, balances, territories, self, borderPlayers).map(player => ({ ...player, density: player.troops / player.land })).sort((a, b) => b.density - a.density);
  if (settings.showThreatPanel) {
    content.append(heading(borderPlayers === null ? "Threat ranking" : "Border threats"));
    if (!rivals.length) content.append(line(borderPlayers === null ? "No opponents available." : "No bordering opponents."));
    rivals.slice(0, 5).forEach((player, index) => content.append(line(`${index + 1}. ${player.name} | troops ${format(player.troops)} | land ${format(player.land)} | density ${player.density.toFixed(1)}`)));
    content.append(line(borderPlayers === null ? "Global ranking fallback; adjacency unavailable." : "Detected from four-neighbor map borders."));
  }
  if (settings.showAttackEstimate) {
    content.append(heading("Attack estimate"));
    const targets = makePlayers(names, balances, territories, self, borderPlayers).sort((a, b) => b.troops / Math.max(1, b.land) - a.troops / Math.max(1, a.land));
    const targetId = targets.some(player => player.id === selectedTargetId) ? selectedTargetId : targets[0]?.id;
    const target = targets.find(player => player.id === targetId);
    targetSelect.replaceChildren(...targets.map(player => { const option = document.createElement("option"); option.value = String(player.id); option.textContent = player.name; option.selected = player.id === targetId; return option; }));
    if (targets.length) content.append(targetSelect);
    const ownTroops = number(balances[self]);
    if (!target) content.append(line("No valid bordering target."));
    else {
      const lossRate = 0.35, suggested = Math.min(ownTroops, Math.ceil(target.troops / (1 - lossRate))), loss = Math.ceil(suggested * lossRate);
      content.append(line(`Target: ${target.name} (${format(target.troops)} troops)`), line(`Suggested send: ${format(suggested)} / ${format(ownTroops)}`), line(`Estimated loss: ${format(loss)}`), line(`Estimated remaining: ${format(Math.max(0, ownTroops - suggested))}`), line("Rough estimate: assumes 35% attacking losses; ignores terrain, timing, and reinforcements."));
    }
  }
}
setInterval(render, 1000);
export function setMapReader(reader) { mapReader = reader; }
export default { render, setMapReader };