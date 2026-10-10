import { definePatch, insert } from "../modUtils.js";

// Expose the game's 0..9 tick counter used by the balance bar.
export default definePatch(({ modifyCode }) => {
  modifyCode(`var aB7 = ae.aB8;`, `var aB7 = ae.aB8; ${insert(`window.__fx.currentTick = 9 - eh; if (__fx.autoStrategyTick) __fx.autoStrategyTick(9 - eh);`)}`);
});
