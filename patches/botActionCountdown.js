import { definePatch } from "../modUtils.js";

// These identifiers are verified against Territorial.io 2.16.54.
export default definePatch(({ replaceOne }) => {
    replaceOne(/this\.l5=null[,;]this\.kp=\[97,94,70,40,20,0,100\]/g,
        `__fx.botActionCountdown=function(player){
            if(!__fx.settings.showBotActionCountdown||!aE.lE||aE.hi||
                player<aE.ku||!ah.hN[player])return "";
            var ticks=kz[player];
            if(!(ticks>0)||!(bi.aDc>0))return "";
            return "  ACT "+(ticks*bi.aDc/1000).toFixed(1)+"s";
        };
        this.l5=null;this.kp=[97,94,70,40,20,0,100]`);
});
