// This class handles controlling the velocity magnitude of particles in a simulation

// Custom libraries
const constants = require("../constants");
const Controller = require("./controller");

module.exports = class MagnitudeController extends Controller {
    constructor (Util, runProperties) {
        super(Util, runProperties);
        this.maxSpeed = runProperties.particleDefaults.maxSpeed;

        // Values specific to individual control functions
        this.heightmapChannel = constants.HEIGHTMAP_RGB;
        this.noiseOffset = 4; // Offset to avoid duplicate noise values of other controllers
        this.xNoiseOffset = this.noiseOffset * runProperties.width;
        this.yNoiseOffset = this.noiseOffset * runProperties.height;
        this.constantMagnitudes = {};
        this.globalConstantMagnitude = Util.RandomRange(0, 1);
        this.boostCount = Util.RandomRangeInt(0, 10);

        // The control function is the means by which this controller modified a particle
        this.controlFunctions = [this.Noise, this.Random, this.Constant, this.GlobalConstant, this.Speedup, this.Slowdown, this.Boosts, this.Heightmap, this.TimeMux, this.HeightmapMux];
        this.controlFunctionsNoMux = [this.Noise, this.Random, this.Constant, this.GlobalConstant, this.Speedup, this.Slowdown, this.Boosts, this.Heightmap];

        this.RandomizeControl();
        
        this.savableProperties.push("globalConstantMagnitude", "waveCount");
    }

    // Magnitude functions return a value from 0 to 1
    Noise (particle) {
        return this.Util.clamp((this.Util.noise3D(particle.position.x + this.xNoiseOffset, particle.position.y + this.yNoiseOffset, this.t) + 1) / 2, 0, 1);
    }
    Random (particle) {
        return Math.random();
    }
    Constant (particle) {
        if (!(particle.uuid in this.constantMagnitudes)) {
            this.constantMagnitudes[particle.uuid] = Math.random();
        }
        return this.constantMagnitudes[particle.uuid];
    }
    GlobalConstant (particle) {
        return this.globalConstantMagnitude;
    }
    Speedup (particle) {
        return particle.timeAlive / particle.lifespan;
    }
    Slowdown (particle) {
        return 1 - (particle.timeAlive / particle.lifespan);
    }
    Boosts (particle) {
        return (Math.sin(2 * Math.PI * particle.timeAlive / (particle.lifespan / this.boostCount)) + 1) / 2;
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
