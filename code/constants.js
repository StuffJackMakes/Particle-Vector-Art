// This file constains descriptive values used for constants

module.exports.LINE_CAP_FLAT = 0; // Flat edge stopping at the particle's position
module.exports.LINE_CAP_ROUND = 1; // Circle centered at the particle's position
module.exports.LINE_CAP_SQUARE = 2; // Square centered at the particle's position

module.exports.LINE_JOIN_ROUND = 0; // Rounded connections between particle trail sections
module.exports.LINE_JOIN_BEVEL = 1; // Beveled connections between particle trail sections
module.exports.LINE_JOIN_SHARP = 2; // Sharp connections between particle trail sections

module.exports.EDGE_BEHAVIOR_NONE = 0; // Particles can go off the edge and come back on at will
module.exports.EDGE_BEHAVIOR_WRAP = 1; // Particles wrap to the other edge
module.exports.EDGE_BEHAVIOR_KILL = 2; // Particles are killed when going past the edge
module.exports.EDGE_BEHAVIOR_WRAP_CONTINUE = 3; // Particles wrap to the other edge and continue drawing their path 
module.exports.EDGE_BEHAVIOR_BOUNCE = 4; // Particles reverse velocity when hitting an edge

module.exports.HEIGHTMAP_RED = 0; // Red component of the heightmap output
module.exports.HEIGHTMAP_GREEN = 1; // Green component of the heightmap output
module.exports.HEIGHTMAP_BLUE = 2; // Blue component of the heightmap output
module.exports.HEIGHTMAP_RGB = 3; // Red, Green, and Blue components of the heightmap output

module.exports.NOISE_TYPE_SIMPLEX = 0; // Simplex noise
module.exports.NOISE_TYPE_BROWNIAN = 1; // Brownian noise
module.exports.NOISE_TYPE_RANDOM = 2; // Javascript Math.random() noise
