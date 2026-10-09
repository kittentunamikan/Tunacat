import { definePatch } from '../modUtils.js';

// Version-specific hooks fail the build if the upstream identifiers change.
export default definePatch(({ replaceOne }) => {
  replaceOne(/function a0J\(\)\{/g, `function a0J(){
    __fx.drawAutoSpawnPreview=function(){if(__fx.autoSpawnPreview){
      var previewPlayers=[];
      if(aE.hx)for(var previewId=0;previewId<aE.ku;previewId++)
        if(ah.nU[previewId]!==0&&ah.hN[previewId]===0)previewPlayers.push(previewId);
      __fx.autoSpawnPreview.render(ws,{
        enabled:!!(__fx.settings.showAutoSpawnPreview&&aE.hx&&!aE.lE&&!aE.hi),
        width:bV.fk,height:bV.fl,map:aEE,seed:az.aO2()*2+1,
        players:previewPlayers,names:ah.a0j,zoom:im,panX:jD,panY:jE,
        isLand:function(x,y){return ad.fU(ad.zt(x,y));},
        isOccupied:function(x,y){return ad.k5(ad.zt(x,y));}
      });
    }};
  `);
  // Draw after the map and spawn glows, not before they cover the overlay.
  replaceOne(/u\.wr\(\)\}function a0P/g, `u.wr();
    if(__fx.drawAutoSpawnPreview)__fx.drawAutoSpawnPreview();
  }function a0P`);
});
