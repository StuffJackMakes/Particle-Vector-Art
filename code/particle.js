// Import third-party libraries
const UUID = require("uuid/v1");
const Victor = require("victor");

// Import custom libraries
const constants = require("./constants");


module.exports = class Particle {
    constructor (Util, heightmapFunction, positionController, runProperties, particleProperties) {
        // Required properties
        this.Util = Util;
        this.heightmapFunction = heightmapFunction;
        this.positionController = positionController;
        this.canvasWidth = runProperties.width;
        this.canvasHeight = runProperties.height;
        this.canvasColor = runProperties.backgroundColor;
        this.palette = runProperties.palette;
        
        // "default" values
        this.minSize = particleProperties.minSize;
        this.maxSize = particleProperties.maxSize;
        this.minLifespan = particleProperties.minLifespan;
        this.maxLifespan = particleProperties.maxLifespan;
        this.minSpeed = particleProperties.minSpeed;
        this.maxSpeed = particleProperties.maxSpeed;
        this.skipPattern = particleProperties.skipPattern;
        this.lineCapBehavior = particleProperties.lineCapBehavior;
        this.lineJoinBehavior = particleProperties.lineJoinBehavior;
        this.edgeBehavior = particleProperties.edgeBehavior;
        this.overshoot = particleProperties.overshoot;

        this.paperGroup = null;
        this.previousPath = null

        // Parse the skip pattern
        if (this.skipPattern) {
            this.skipCounter = 0;
            this.skipIndex = 0;
            this.skipVisible = false;

            let sum = 0;
            let pattern = [];
            for (let p of this.skipPattern) {
                sum += p;
                pattern.push(sum);
            }
            this.skipPattern = pattern;
        }

        // Set variable attributes based on this particle's properties
        this.resetParticle();
    }

    resetParticle () {
        if (this.previousPath !== null) {
            this.paperGroup.addChild(this.previousPath);
            this.previousPath = null;
        }

        this.uuid = UUID();
        this.baseColor = this.Util.RandomColorFromPalette(this.palette);
        this.color = this.baseColor;
        this.position = this.positionController.Control();
        this.previousPosition = this.position.clone();
        this.velocity = new Victor(0, 0); //this.Util.RandomRange(-this.initialSpeed, this.initialSpeed),
                                   //this.Util.RandomRange(-this.initialSpeed, this.initialSpeed));
        this.acceleration = new Victor(0, 0);

        this.size = this.Util.RandomRange(this.minSize, this.maxSize);
        this.previousSize = this.size;

        this.lifespan = this.Util.RandomRange(this.minLifespan, this.maxLifespan);
        this.timeAlive = 0;

        this.skipCounter = 0;
        this.skipIndex = 0;
        this.skipVisible = true;

        this.paperGroup = null;
    }

    step (noiseFunctions, paper) {
        // Retrieve the noise fields from the array
        let angleFunction = noiseFunctions[0];
        let magnitudeFunction = noiseFunctions[1];
        let sizeFunction = noiseFunctions[2];
        let colorFunction = noiseFunctions[3];

        // Get the heightmap value at this position
        this.heightmapValues = this.heightmapFunction(this.position.x, this.position.y);

        // Calculate acceration
        let angleVector = angleFunction(this);
        let magnitude = this.Util.NumberLerp(this.minSpeed, this.maxSpeed, magnitudeFunction(this));
        this.acceleration = angleVector.multiply(new Victor(magnitude, magnitude));

        // Apply acceleration
        this.velocity.add(this.acceleration);
        if (this.velocity.magnitude() > this.maxSpeed) {
            this.velocity.normalize();
            this.velocity.multiply(new Victor(this.maxSpeed, this.maxSpeed));
        } else if (this.velocity.magnitude() < this.minSpeed) {
            this.velocity.normalize();
            this.velocity.multiply(new Victor(this.minSpeed, this.minSpeed));
        }

        // Apply velocity
        this.previousPosition = this.position.clone();
        this.position.add(this.velocity);
        this.acceleration = new Victor(0, 0);

        // Apply overshoot
        this.overshootPosition = this.position.clone();
        if (this.overshoot !== 0) {
            this.overshootPosition.add(this.velocity.clone().multiply(new Victor(this.overshoot, this.overshoot)));
        }

        // Adjust size
        this.previousSize = this.size;
        this.size = this.Util.NumberLerp(this.minSize, this.maxSize, sizeFunction(this));

        // Adjust color
        this.color = colorFunction(this);

        // Draw the particle
        if (this.skipPattern) {
            // If there is a skip pattern, determine if the particle should be drawn
            this.skipCounter += 1;
            if (this.skipCounter > this.skipPattern[this.skipIndex]) {
                this.skipIndex += 1;
                if (this.skipIndex >= this.skipPattern.length) {
                    this.skipIndex = 0;
                    this.skipCounter = 0;
                }
                this.skipVisible = !this.skipVisible;
            }

            if (this.skipVisible) {
                this.draw(paper);
            }
        } else {
            this.draw(paper);
        }

        // Update how long this particle has been alive and reset it if necesarry
        this.timeAlive += 1;
        if (this.timeAlive > this.lifespan) {
            this.resetParticle();
        } else if (this.position.x < 0 ||this.position.x > this.canvasWidth ||
            this.position.y < 0 || this.position.y > this.canvasHeight) {
            // If this particle is out of the canvas bounds, take action based on the 'edgeBehvaior'
            if (this.edgeBehavior === constants.EDGE_BEHAVIOR_WRAP ||
                this.edgeBehavior === constants.EDGE_BEHAVIOR_WRAP_CONTINUE) {
                
                // Draw and clear any existing path if not coninuting the path after wrapping
                if (this.edgeBehavior === constants.EDGE_BEHAVIOR_WRAP && this.previousPath !== null) {
                    this.paperGroup.addChild(this.previousPath);
                    this.previousPath = null;
                }

                if (this.position.x < 0) {
                    this.position.addX(new Victor(this.canvasWidth - this.position.x, 0));
                } else if (this.position.x > this.canvasWidth) {
                    this.position.subtractX(new Victor(this.canvasWidth + (this.position.x - this.canvasWidth), 0));
                }
                if (this.position.y < 0) {
                    this.position.addY(new Victor(0, this.canvasHeight - this.position.y));
                } else if (this.position.y > this.canvasHeight) {
                    this.position.subtractY(new Victor(0, this.canvasHeight + (this.position.y - this.canvasHeight)));
                }
            } else if (this.edgeBehavior == constants.EDGE_BEHAVIOR_KILL) {
                this.resetParticle();
            } else if (this.edgeBehavior == constants.EDGE_BEHAVIOR_BOUNCE) {
                this.velocity.invert();
            }

        }
    }

    draw (paper) {
        if (this.previousPath !== null && this.previousPath.strokeWidth === Math.round(this.size) &&
            this.previousPath.strokeColor.toCSS(true) === this.color) {
            // If the size and color haven't changed, add on to the old path
            this.previousPath.add(new paper.Point(this.overshootPosition.x, this.overshootPosition.y));
        } else {
            // Add the previous path to the paper canvas
            if (this.previousPath !== null) {
                this.paperGroup.addChild(this.previousPath);
            }

            // Create a new path
            this.previousPath = new paper.Path();
            this.previousPath.strokeWidth = Math.round(this.size);
            this.previousPath.strokeColor = this.color;
            this.previousPath.add(new paper.Point(this.previousPosition.x, this.previousPosition.y));
            this.previousPath.add(new paper.Point(this.overshootPosition.x, this.overshootPosition.y));
            if (this.lineCapBehavior == constants.LINE_CAP_FLAT) {
                this.previousPath.strokeCap = "butt";
            } else if (this.lineCapBehavior == constants.LINE_CAP_ROUND) {
                this.previousPath.strokeCap = "round";
            } else if (this.lineCapBehavior == constants.LINE_CAP_SQUARE) {
                this.previousPath.strokeCap = "square";
            }
            if (this.lineJoinBehavior == constants.LINE_JOIN_ROUND) {
                this.previousPath.strokeJoin = "round";
            } else if (this.lineJoinBehavior == constants.LINE_JOIN_BEVEL) {
                this.previousPath.strokeJoin = "bevel";
            } else if (this.lineJoinBehavior == constants.LINE_JOIN_SHARP) {
                this.previousPath.strokeJoin = "miter";
            }
        }
        /*
        let path = new paper.Path();
        path.strokeWidth = this.size;
        path.strokeColor = this.color;
        path.add(new paper.Point(this.previousPosition.x, this.previousPosition.y));
        path.add(new paper.Point(this.position.x, this.position.y));
        if (this.lineCapBehavior == constants.LINE_CAP_FLAT) {
            path.strokeCap = "butt";
        } else if (this.lineCapBehavior == constants.LINE_CAP_ROUND) {
            path.strokeCap = "round";
        } else if (this.lineCapBehavior == constants.LINE_CAP_SQUARE) {
            path.strokeCap = "square";
        }
        if (this.lineJoinBehavior == constants.LINE_JOIN_ROUND) {
            path.strokeJoin = "round";
        } else if (this.lineJoinBehavior == constants.LINE_JOIN_BEVEL) {
            path.strokeJoin = "bevel";
        } else if (this.lineJoinBehavior == constants.LINE_JOIN_SHARP) {
            path.strokeJoin = "miter";
        }
        this.paperGroup.addChild(path);
        */
    }
}
