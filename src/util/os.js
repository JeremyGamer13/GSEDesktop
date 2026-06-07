import Electron from "electron";

import * as Canvas from "canvas";
import screenshotDesktop from "screenshot-desktop";

class OperatingSystem {
    static async screenshot(onlyElectronWorkingArea) {
        const buffer = await screenshotDesktop({
            format: "png"
        });
        
        let finalBuffer = buffer;
        if (onlyElectronWorkingArea) {
            const display = Electron.screen.getPrimaryDisplay();
            const x = Math.ceil(display.workArea.x * display.scaleFactor);
            const y = Math.ceil(display.workArea.y * display.scaleFactor);
            const width = Math.floor(display.workArea.width * display.scaleFactor);
            const height = Math.floor(display.workArea.height * display.scaleFactor);

            const canvas = Canvas.createCanvas(width, height);
            const ctx = canvas.getContext("2d");
            
            const image = await Canvas.loadImage(buffer);
            ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
            finalBuffer = canvas.toBuffer("image/png");
        }

        return finalBuffer;
    }
}

export default OperatingSystem;