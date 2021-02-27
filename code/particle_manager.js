// Import custom libraries
const constants = require("./constants");
const Particle = require("./particle");


module.exports = class ParticleManager {
    constructor(Util, runProperties) {
        this.Util = Util;

        // Default particle values
        this.particleProperties = {};
        this.particleProperties.minSize = 1; // Minimum particle size
        this.particleProperties.maxSize = Math.sqrt(runProperties.width * runProperties.height) / 32; // Maximum particle size
        this.particleProperties.minLifespan = Math.ceil(runProperties.totalSteps / 100); // Minimum particle lifespan
        this.particleProperties.maxLifespan = Math.ceil(runProperties.totalSteps / 2); // Maximum particle lifespan
        this.particleProperties.minSpeed = 1; // Minimum particle speed
        this.particleProperties.maxSpeed = Math.sqrt(runProperties.width * runProperties.height) / 50; // Maximum particle speed
        this.particleProperties.skipPattern = null; // How many time steps the particle is being drawn, then not, then drawn, etc
        if (Math.random() > 0.25) this.particleProperties.skipPattern = Util.RandomSkipPattern();
        this.particleProperties.lineCapBehavior = Util.RandomRangeInt(0, 3); // How particle line ends are capped
        this.particleProperties.lineJoinBehavior = Util.RandomRangeInt(0, 3); // How particle lines are joined
        this.particleProperties.edgeBehavior = constants.EDGE_BEHAVIOR_KILL; // how particles behave when they hit an edge
        this.particleProperties.overshoot = 0;

        this.particles = [];
    }

    RandomizeParticleDefaults = (Util, runProperties) => { //width, height, totalSteps, Util) => {
        let dim = Math.round((runProperties.width + runProperties.height) / 2);
        this.defaultMinSize = Math.max(1, Util.RandomRangeInt(Math.ceil(dim / 1000), Math.ceil(dim / 250)));
        this.defaultMaxSize = Util.RandomRangeInt(this.defaultMinSize + 1, Math.ceil(dim / 75));
        this.defaultMinLifespan =  Math.max(4, Util.RandomRangeInt(Math.round(runProperties.totalSteps / 70), Math.round(runProperties.totalSteps / 30)));
        this.defaultMaxLifespan =  Util.RandomRangeInt(this.defaultMinLifespan, Math.round(runProperties.totalSteps / 5));
        //this.defaultInitialSpeed =  Util.RandomRangeInt(0, Math.round(dim / 50));
        this.defaultMinSpeed = Util.RandomRangeInt(1, Math.max(1, Math.ceil(dim / 500)));
        this.defaultMaxSpeed = Util.RandomRangeInt(this.defaultMinSpeed + 1, Math.ceil(dim / 30));
        if (Math.random() > 0.90) {
            this.defaultSkipPattern = Util.RandomSkipPattern();
        } else {
            this.defaultSkipPattern = null;
        }
        this.defaultLineCapBehavior = Util.RandomRangeInt(0, 3);
        this.defaultLineJoinBehavior = Util.RandomRangeInt(0, 3);
        this.defaultEdgeBehavior = Util.RandomRangeInt(0, 5);
        // Make wrapping continue edge behavior less common
        if (this.defaultEdgeBehavior == 3) {
            this.defaultEdgeBehavior = Util.RandomRangeInt(0, 5);
        }
        if (Math.random() > 0.90) {
            this.defaultOvershoot = Util.RandomRange(0.5, 8);
        } else {
            this.defaultOvershoot = 0;
        }
    }

    SpawnParticle(heightmapFunction, runProperties) {
        this.particles.push(new Particle(this.Util, heightmapFunction, this.positionController, runProperties, this.particleProperties));
    }

    ClearParticles() {
        this.particles = [];
    }

    ResetControllers() {
        this.angleController.t = 0;
        this.magnitudeController.t = 0;
        this.sizeController.t = 0;
        this.colorController.t = 0;
        this.positionController.t = 0;
    }

    SetControllers(angleController, magnitudeController, sizeController, colorController, positionController) {
        this.angleController = angleController;
        this.magnitudeController = magnitudeController;
        this.sizeController = sizeController;
        this.colorController = colorController;
        this.positionController = positionController;
    }

    StepParticles(t, paper) {
        this.angleController.t = t;
        this.magnitudeController.t = t;
        this.sizeController.t = t;
        this.colorController.t = t;
        this.positionController.t = t;

        // If if this is the first timestep, create the group for each particle to draw as part of
        if (t === 0) {
            for (let p of this.particles) {
                p.paperGroup = new paper.Group();
            }
        }

        // Step each particle
        for (let p of this.particles) {
            if (p.paperGroup === null) {
                p.paperGroup = new paper.Group();
            }

            p.step([this.angleController.Control, this.magnitudeController.Control,
                    this.sizeController.Control, this.colorController.Control], paper);
        }
    }

    GetProperties() {
        this.particleProperties;
        /*
        return {
            minSize: this.defaultMinSize,
            maxSize: this.defaultMaxSize,
            minLifespan: this.defaultMinLifespan,
            maxLifespan: this.defaultMaxLifespan,
            //initialSpeed: this.defaultInitialSpeed,
            minSpeed: this.defaultMinSpeed,
            maxSpeed: this.defaultMaxSpeed,
            skipPattern: this.particleProperties.defaultSkipPattern,
            lineCapBehavior: this.particleProperties.defaultLineCapBehavior,
            lineJoinBehavior: this.particleProperties.defaultLineJoinBehavior,
            edgeBehavior: this.particleProperties.defaultEdgeBehavior,
            overshoot: this.particleProperties.defaultOvershoot
        }
        */
    }

    SetProperties(properties) {
        if ("minSize" in properties) this.particleProperties.minSize = properties.minSize;
        if ("maxSize" in properties) this.particleProperties.maxSize = properties.maxSize;
        if ("minLifespan" in properties) this.particleProperties.minLifespan = properties.minLifespan;
        if ("maxLifespan" in properties) this.particleProperties.maxLifespan = properties.maxLifespan;
        if ("minSpeed" in properties) this.particleProperties.minSpeed = properties.minSpeed;
        if ("maxSpeed" in properties) this.particleProperties.maxSpeed = properties.maxSpeed;
        if ("skipPattern" in properties) this.particleProperties.skipPattern = properties.skipPattern;
        if ("lineCapBehavior" in properties) this.particleProperties.lineCapBehavior = properties.lineCapBehavior;
        if ("lineJoinBehavior" in properties) this.particleProperties.lineJoinBehavior = properties.lineJoinBehavior;
        if ("edgeBehavior" in properties) this.particleProperties.edgeBehavior = properties.edgeBehavior;
        if ("overshoot" in properties) this.particleProperties.overshoot = properties.overshoot;

    }
}