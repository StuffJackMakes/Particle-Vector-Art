// This class handles controlling the velocity direction particles in a simulation

// Third-party libraries
const Victor = require("victor");

// Custom libraries
const constants = require("../constants");
const Controller = require("./controller");

module.exports = class AngleController extends Controller {
    constructor (Util, runProperties) {
        super(Util, runProperties);

        // Values specific to individual control functions
        this.heightmapChannel = constants.HEIGHTMAP_RGB;
        this.noiseOffset = 2; // Offset to avoid duplicate noise values of other controllers
        this.xNoiseOffset = this.noiseOffset * runProperties.width;
        this.yNoiseOffset = this.noiseOffset * runProperties.height;
        this.constantVectors = {};
        this.startingAngles = {};
        this.globalConstantAngleX = this.Util.RandomRange(-1, 1);
        this.globalConstantAngleY = this.Util.RandomRange(-1, 1);
        this.roundAngleResults = Math.random() > 0.5 ? true : false;
        this.roundToAngle = Util.RandomRangeInt(10, 90);
        this.CurlCount = Util.RandomRangeInt(1, 10);
        this.waveCount = Util.RandomRangeInt(1, 10);
        this.loopCount = Util.RandomRangeInt(1, 10);

        // The control function is the means by which this controller modified a particle
        this.controlFunctions = [this.Noise, this.Constant, this.GlobalConstant, this.Random, this.Curls, this.Waves, this.Loops, this.Heightmap, this.TimeMux, this.HeightmapMux];
        this.controlFunctionsNoMux = [this.Noise, this.Contant, this.GlobalConstant, this.Random, this.Curls, this.Waves, this.Loops, this.Heightmap];

        this.RandomizeControl();
        
        this.savableProperties.push("globalConstantAngleX", "globalConstantAngleY", "roundAngleResults", "roundToAngle", "waveCount", "loopCount");
    }

    // Generic control functions
    RoundOutput (output) {
        if (this.roundAngleResults) {
            let angle = this.Util.RoundToNearest(output.angle(), this.roundToAngle * (Math.PI / 180));
            return new Victor(Math.cos(angle), Math.sin(angle));
        }
        return output;
    }
    GetConstantVector(particle) {
        if (!(particle.uuid in this.constantVectors)) {
            this.constantVectors[particle.uuid] = this.Util.RandomAngleVector();
        }
        return this.constantVectors[particle.uuid];
    }
    GetStartAngle(particle) {
        if (!(particle.uuid in this.startingAngles)) {
            this.startingAngles[particle.uuid] = this.Util.RandomAngle();
        }
        return this.startingAngles[particle.uuid];
    }

    // Angle functions return a Victor with length 1
    Noise (particle) {
        let angle = this.Util.noise3D(particle.position.x + this.xNoiseOffset, particle.position.y + this.yNoiseOffset, this.t) * 2 * Math.PI;
        return this.RoundOutput(new Victor(Math.cos(angle), Math.sin(angle)));
    }
    Random (particle) {
        return this.RoundOutput(new Victor(Math.cos(Math.random() * 2 * Math.PI), Math.sin(Math.random() * 2 * Math.PI)));
    }
    Constant (particle) {
        return this.RoundOutput(this.GetConstantVector(particle));
    }
    GlobalConstant (particle) {
        return this.RoundOutput(new Victor(this.globalConstantAngleX, this.globalConstantAngleY).normalize());
    }
    Curls (particle) {
        let angle = this.GetStartAngle(particle) + Math.sin((this.curlCount * particle.timeAlive / particle.lifespan) * 2 * Math.PI) * Math.PI;
        return this.RoundOutput(new Victor(Math.cos(angle), Math.sin(angle)));
    }
    Waves (particle) {
        let angle = this.GetStartAngle(particle) + (Math.sin(2 * Math.PI * particle.timeAlive / (particle.lifespan / this.waveCount)) + 1) / 2;
        return this.RoundOutput(new Victor(Math.cos(angle), Math.sin(angle)));
    }
    Loops (particle) {
        let angle = this.GetStartAngle(particle) + (this.loopCount * particle.timeAlive / particle.lifespan) * 2 * Math.PI;
        return this.RoundOutput(new Victor(Math.cos(angle), Math.sin(angle)));
    }
    Heightmap (particle) {
        return this.RoundOutput(new Victor(Math.cos(this.GetStartAngle(particle) + particle.heightmapValues[this.heightmapChannel] * Math.PI),
            Math.sin(this.GetStartAngle(particle) + particle.heightmapValues[this.heightmapChannel] * Math.PI)));
    }
    HeightmapMux (particle, functionA, functionB) {
        let resultA = functionA(particle);
        let resultB = functionB(particle);
        return this.RoundOutput(this.Util.easeVector(resultA, resultB, particle.heightmapValues[this.heightmapChannel]));
    }
    TimeMux (particle, functionA, functionB) {
        let resultA = functionA(particle);
        let resultB = functionB(particle);
        return this.RoundOutput(this.Util.easeVector(resultA, resultB, this.t / this.totalSteps));
    }
}
