// This class handles controlling the color of particles in a simulation

// Custom libraries
const constants = require("../constants");
const Controller = require("./controller");

module.exports = class ColorController extends Controller {
    constructor (Util, runProperties) {
        super(Util, runProperties);

        // Values specific to individual control functions
        this.heightmapChannel = constants.HEIGHTMAP_RGB;
        this.noiseOffset = 3; // Offset to avoid duplicate noise values of other controllers
        this.xNoiseOffset = this.noiseOffset * runProperties.width;
        this.yNoiseOffset = this.noiseOffset * runProperties.height;
        this.runPalette = runProperties.palette;
        this.globalConstantColor = this.Util.RandomColorFromPalette(this.runPalette);
        this.fadeCount = this.Util.RandomRangeInt(1, 8);

        this.controlFunctions = [this.Noise, this.Random, this.RandomPalette, this.Constant, this.GlobalConstant, this.Inverse, this.FadeOut, this.FadeIn, this.FadeInOut, this.TimeMux, this.HeightmapMux];
        this.controlFunctionsNoMux = [this.Noise, this.Random, this.RandomPalette, this.Constant, this.GlobalConstant, this.Inverse, this.FadeOut, this.FadeIn, this.FadeInOut];

        this.RandomizeControl();

        this.savableProperties.push("globalConstantColor");
    }

    // Color functions return a color in string hex format (e.x. "#fd8a81")
    Noise (particle) {
        return this.Util.noiseColor(particle.position.x + this.xNoiseOffset, particle.position.y + this.yNoiseOffset, this.t);
    }
    Random (particle) {
        return this.Util.RandomColor();
    }
    RandomPalette (particle) {
        return this.Util.RandomColorFromPalette(this.runPalette);
    }
    Constant (particle) {
        return particle.baseColor;
    }
    GlobalConstant (particle) {
        return this.globalConstantColor;
    }
    Inverse (particle) {
        return this.Util.InvertColor(particle.baseColor);
    }
    FadeOut (particle) {
        return this.Util.ColorLerp(particle.baseColor, particle.canvasColor, (particle.timeAlive / particle.lifespan));
    }
    FadeIn (particle) {
        return this.Util.ColorLerp(particle.canvasColor, particle.baseColor, (particle.timeAlive / particle.lifespan));
    }
    FadeInOut (particle) {
        return this.Util.ColorLerp(particle.canvasColor, particle.baseColor,
            (Math.sin(2 * Math.PI * particle.timeAlive / (particle.lifespan / this.fadeCount)) + 1) / 2);
    }
    TimeMux (particle, functionA, functionB) {
        let resultA = functionA(particle);
        let resultB = functionB(particle);
        return this.Util.easeColor(resultA, resultB, this.t / this.totalSteps);
    }
    HeightmapMux (particle, functionA, functionB) {
        let resultA = functionA(particle);
        let resultB = functionB(particle);
        return this.Util.easeColor(resultA, resultB, particle.heightmapValues[this.heightmapChannel]);
    }
}
