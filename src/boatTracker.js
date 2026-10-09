import { getSettings } from "./settings.js";

export function drawBoatRoutes(ctx, boats, view, getColor, settings) {
    if ((!settings.showBoatTrajectories && !settings.showBoatTroops) || !boats.mk) return;
    const { width, scale, offsetX, offsetY } = view;
    if (!(width > 0 && scale > 0)) return;
    const point = cell => [
        (cell % width + 0.5) * scale - offsetX,
        (Math.floor(cell / width) + 0.5) * scale - offsetY
    ];
    ctx.save();
    try {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.lineWidth = 4;
        ctx.lineJoin = "round";
        const labelScale = Math.max(1, Math.min(2, Math.sqrt(scale)));
        ctx.font = `${12 * labelScale}px Trebuchet MS`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        for (let i = 0; i < boats.mk; i++) {
            const route = boats.mm[i];
            if (!route || route.length < 2 || boats.a8m[i] <= 0) continue;
            const rgb = getColor(boats.mo[i] >> 3);
            if (!rgb || rgb.length < 3) continue;
            const color = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
            const packedWidth = width * 16;
            const current = boats.mz[i];
            const x = current % packedWidth / 16 * scale - offsetX;
            const y = Math.floor(current / packedWidth) / 16 * scale - offsetY;
            const end = point(route[route.length - 1]);
            if (settings.showBoatTrajectories) {
                ctx.strokeStyle = color;
                ctx.globalAlpha = 0.8;
                ctx.setLineDash([6, 5]);
                ctx.beginPath();
                ctx.moveTo(x, y);
                // my is the segment start; its next node is the next waypoint.
                for (let j = boats.my[i] + 1; j < route.length; j++) {
                    const next = point(route[j]);
                    ctx.lineTo(next[0], next[1]);
                }
                ctx.strokeStyle = "rgba(0,0,0,0.85)";
                ctx.lineWidth = 7;
                ctx.stroke();
                ctx.strokeStyle = color;
                ctx.lineWidth = 4;
                ctx.stroke();
                ctx.lineWidth = 2;
                ctx.setLineDash([]);
                ctx.beginPath();
                ctx.arc(end[0], end[1], 5, 0, Math.PI * 2);
                ctx.stroke();
            }
            if (settings.showBoatTroops) {
                ctx.globalAlpha = 1;
                const text = String(boats.a8m[i]);
                ctx.fillStyle = "rgba(0,0,0,0.75)";
                ctx.fillRect(end[0] + 8 * labelScale, end[1] - 9 * labelScale, ctx.measureText(text).width + 8 * labelScale, 18 * labelScale);
                // Keep the troop number readable on dark team colors.
                ctx.lineWidth = 3 * labelScale;
                ctx.strokeStyle = "rgba(0,0,0,0.95)";
                ctx.strokeText(text, end[0] + 12 * labelScale, end[1]);
                ctx.fillStyle = "#ffffff";
                ctx.fillText(text, end[0] + 12 * labelScale, end[1]);
            }
        }
    } finally {
        ctx.restore();
    }
}

export default {
    draw(ctx, boats, view, getColor) {
        drawBoatRoutes(ctx, boats, view, getColor, getSettings());
    }
};
