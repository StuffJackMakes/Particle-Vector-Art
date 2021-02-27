// This class handles controlling the size of particles in a simulation

// Custom libraries
const constants = require("../constants");
const Controller = require("./controller");

module.exports = class SizeController extends Controller {
    constructor (Util, runProperties) {
        super(Util, runProperties);

        // Values specific to individual control functions
        this.heightmapChannel = constants.HEIGHTMAP_RGB;
        this.noiseOffset = 5; // Offset to avoid duplicate noise values of other controllers
        this.xNoiseOffset = this.noiseOffset * runProperties.width;
        this.yNoiseOffset = this.noiseOffset * runProperties.height;


        // The control function is the means by which this controller modified a particle
        this.controlFunctions = [this.Noise, this.Random, this.Big, this.Medium, this.Small, this.Shrink, this.Grow, this.Heightmap, this.TimeMux, this.HeightmapMux];
        this.controlFunctionsNoMux = [this.Noise, this.Random, this.Big, this.Medium, this.Small, this.Shrink, this.Grow, this.Heightmap];


        this.RandomizeControl();
    }

    // Size functions return a value from 0 to 1
    Noise (particle) {
        return 0.5 + (this.Util.noise3D(particle.position.x + this.xNoiseOffset, particle.position.y + this.yNoiseOffset, this.t) / 2);
    }
    Random (particle) {
        return Math.random();
    }
    Big (particle) {
        return 1;
    }
    Medium (particle) {
        return 0.5;
    }
    Small (particle) {
        return 0;
    }
    Shrink (particle) {
        return 1 - (particle.timeAlive / particle.lifespan);
    }
    Grow (particle) {
        return particle.timeAlive / particle.lifespan;
    }
    Heightmap (particle) {
        return particle.heightmapValues[this.heightmapChannel];
    }
    HeightmapMux (particle, functionA, functionB) {
        let resultA = functionA(particle);
        let resultB = functionB(particle);
        return this.Util.easeNumber(resultA, resultB, particle.heightmapValues[this.heightmapChannel]);
    }
    TimeMux (particle, functionA, functionB) {
        let resultA = functionA(particle);
        let resultB = functionB(particle);
        return this.Util.easeNumber(resultA, resultB, this.t / this.totalSteps);
    }
}
