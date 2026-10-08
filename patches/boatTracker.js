import { definePatch } from "../modUtils.js";

// Verified against Territorial.io 2.16.54 (the supplied game.js).
// Fail the build on a changed hook instead of silently producing a broken mod.
export default definePatch(({ replaceOne }) => {
    replaceOne(/this\.wr=function\(\)\{this\.aZQ\.wr\(\)[;,]this\.a0N\.wr\(\);?\}/g,
        `this.wr=function(){
            __fx.boatTracker.draw(ws,this.z,
                {width:bV.fk,scale:im,offsetX:jD,offsetY:jE},
                function(player){return aE.iT?bj.aSp[bj.aCr[player]]:ad.a9T(player)});
            this.aZQ.wr(),this.a0N.wr()
        }`);
});
