// Scene.js

function createShader(gl, t, s) {
  let sh = gl.createShader(t);
  gl.shaderSource(sh, s);
  gl.compileShader(sh);
  return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : (console.error(gl.getShaderInfoLog(sh)), null);
}
function createProgram(gl, vs, fs) {
  let p = gl.createProgram();
  gl.attachShader(p, createShader(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, createShader(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : (console.error(gl.getProgramInfoLog(p)), null);
}

// We'll use three programs:
// colorProgram for colored geometry (ground)
// trunkProgram for textured cubes (for trunk and leaves)
// skyboxProgram for the skybox.
var colorProgram, trunkProgram, skyboxProgram;
var logTexture, leafTexture, skyTexture;
var trees = [];
// We'll use dynamicBlocks to store blocks placed by the user.
var dynamicBlocks = {};

// Shader sources
const colorVS = `
  attribute vec4 a_Position;
  attribute vec4 a_Color;
  attribute vec2 a_TexCoord;
  uniform mat4 u_ViewProjection;
  uniform mat4 u_Model;
  varying vec4 v_Color;
  void main(){
    gl_Position = u_ViewProjection * u_Model * a_Position;
    v_Color = a_Color;
  }
`;
const colorFS = `
  precision mediump float;
  varying vec4 v_Color;
  void main(){
    gl_FragColor = v_Color;
  }
`;
const trunkVS = `
  attribute vec4 a_Position;
  attribute vec2 a_TexCoord;
  uniform mat4 u_ViewProjection;
  uniform mat4 u_Model;
  varying vec2 v_TexCoord;
  void main(){
    gl_Position = u_ViewProjection * u_Model * a_Position;
    v_TexCoord = a_TexCoord;
  }
`;
const trunkFS = `
  precision mediump float;
  varying vec2 v_TexCoord;
  uniform sampler2D u_Texture;
  void main(){
    gl_FragColor = texture2D(u_Texture, v_TexCoord);
  }
`;
const skyVS = `
  attribute vec3 a_Position;
  uniform mat4 u_ViewProjection;
  varying vec3 v_TexCoord;
  void main(){
    v_TexCoord = a_Position;
    gl_Position = u_ViewProjection * vec4(a_Position, 1.0);
  }
`;
const skyFS = `
  precision mediump float;
  varying vec3 v_TexCoord;
  uniform samplerCube u_Skybox;
  void main(){
    gl_FragColor = textureCube(u_Skybox, v_TexCoord);
  }
`;

// Create a Minecraft-style cherry tree: 4 trunk blocks and 3x3x2 leaves.
function createCherryTree(b) {
  let t = { trunk: [], leaves: [] };
  for (let i = 0; i < 4; i++) {
    t.trunk.push([b[0], i, b[1]]);
  }
  for (let y = 0; y < 2; y++) {
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        t.leaves.push([b[0] + x, 4 + y, b[1] + z]);
      }
    }
  }
  return t;
}
// Draw a cherry tree: trunk with logTexture; leaves with leafTexture.
function drawCherryTree(gl, t) {
  // Draw trunk cubes.
  gl.useProgram(trunkProgram);
  for (let i = 0; i < t.trunk.length; i++) {
    let m = mat4.create();
    mat4.translate(m, m, t.trunk[i]);
    drawTexturedCube(gl, trunkProgram, m, logTexture);
  }
  // Draw leaf cubes.
  gl.useProgram(trunkProgram);
  for (let i = 0; i < t.leaves.length; i++) {
    let m = mat4.create();
    mat4.translate(m, m, t.leaves[i]);
    drawTexturedCube(gl, trunkProgram, m, leafTexture);
  }
}

// Draw ground as one large quad covering 50x50 blocks.
function drawGround(gl, prog) {
  let m = mat4.create();
  // Our drawColoredQuad spans 200 units, so scale down to 50.
  let scale = 0.25;
  mat4.scale(m, m, [scale, 1, scale]);
  drawColoredQuad(gl, prog, m, [0, 0.8, 0, 1]);
}

// Simple raycast: steps along a ray from camPos in the direction defined by camRot and camPitch (from Camera.js)
// Returns the cell (as an array of integers) and its key if a dynamic block is hit.
function raycastBlock() {
  let yaw = camRot * Math.PI / 180;
  let pitch = camPitch * Math.PI / 180;
  let dir = [Math.sin(yaw)*Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw)*Math.cos(pitch)];
  let maxT = 10, step = 0.2;
  for (let t = 0; t < maxT; t += step) {
    let pos = [ camPos[0] + dir[0]*t, camPos[1] + dir[1]*t, camPos[2] + dir[2]*t ];
    let cell = pos.map(Math.floor);
    let key = cell.join(",");
    if (dynamicBlocks[key]) {
      return { cell: cell, key: key };
    }
  }
  return null;
}

// Add event listeners for block placement and destruction.
document.getElementById("webgl").addEventListener("mousedown", function(e) {
  e.preventDefault();
  let hit = raycastBlock();
  if (e.button === 0 && hit) { // Left-click: destroy block if present.
    delete dynamicBlocks[hit.key];
  } else if (e.button === 2) { // Right-click: place block adjacent.
    let cell;
    if (hit) {
      // Place block adjacent to the hit cell in the opposite direction of the ray.
      let yaw = camRot * Math.PI / 180, pitch = camPitch * Math.PI / 180;
      let dir = [Math.sin(yaw)*Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw)*Math.cos(pitch)];
      let offset = [
        (dir[0] > 0 ? -1 : (dir[0] < 0 ? 1 : 0)),
        (dir[1] > 0 ? -1 : (dir[1] < 0 ? 1 : 0)),
        (dir[2] > 0 ? -1 : (dir[2] < 0 ? 1 : 0))
      ];
      cell = [ hit.cell[0] + offset[0], hit.cell[1] + offset[1], hit.cell[2] + offset[2] ];
    } else {
      // If no dynamic block is hit, place block 5 units in front of the camera.
      let yaw = camRot * Math.PI / 180, pitch = camPitch * Math.PI / 180;
      cell = [
        Math.floor(camPos[0] + Math.sin(yaw)*Math.cos(pitch)*5),
        Math.floor(camPos[1] + Math.sin(pitch)*5),
        Math.floor(camPos[2] - Math.cos(yaw)*Math.cos(pitch)*5)
      ];
    }
    // Do not allow placing a block at ground level (y == 0).
    if (cell[1] > 0) {
      let key = cell.join(",");
      dynamicBlocks[key] = true;
    }
  }
});
document.getElementById("webgl").addEventListener("contextmenu", e => e.preventDefault());

function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  let vp = updateCamera(gl, colorProgram, canvas);
  let vpMatrix = mat4.create();
  mat4.multiply(vpMatrix, vp.proj, vp.view);
  
  // For skybox: remove translation.
  let skyView = mat4.clone(vp.view);
  skyView[12] = skyView[13] = skyView[14] = 0;
  let skyVP = mat4.create();
  mat4.multiply(skyVP, vp.proj, skyView);
  
  // Set VP for trunkProgram and colorProgram.
  gl.useProgram(trunkProgram);
  gl.uniformMatrix4fv(gl.getUniformLocation(trunkProgram, "u_ViewProjection"), false, vpMatrix);
  gl.useProgram(colorProgram);
  gl.uniformMatrix4fv(gl.getUniformLocation(colorProgram, "u_ViewProjection"), false, vpMatrix);
  
  // Draw skybox.
  gl.useProgram(skyboxProgram);
  gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProgram, "u_ViewProjection"), false, skyVP);
  drawTexturedSkybox(gl, skyboxProgram, 50, skyTexture);
  
  // Draw ground.
  gl.useProgram(colorProgram);
  drawGround(gl, colorProgram);
  
  // Draw dynamic blocks.
  for (let key in dynamicBlocks) {
    let parts = key.split(",").map(Number);
    let m = mat4.fromTranslation(mat4.create(), parts);
    drawColoredCube(gl, colorProgram, m, [0.6, 0.6, 0.6, 1]);
  }
  
  // Draw trees.
  for (let i = 0; i < trees.length; i++) {
    drawCherryTree(gl, trees[i]);
  }
  
  updateFPS();
  requestAnimationFrame(renderScene);
}

// FPS counter
let lastTime = 0, frameCount = 0;
function updateFPS() {
  const now = performance.now();
  frameCount++;
  if (now - lastTime >= 1000) {
    const fps = (frameCount * 1000 / (now - lastTime)).toFixed(1);
    document.getElementById("fpsIndicator").innerText = "FPS: " + fps;
    lastTime = now;
    frameCount = 0;
  }
}

function main() {
  canvas = document.getElementById("webgl");
  if (!canvas) return console.error("No canvas");
  gl = canvas.getContext("webgl");
  if (!gl) return console.error("No WebGL");
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 1);
  
  // Create programs.
  colorProgram = createProgram(gl, colorVS, colorFS);
  trunkProgram = createProgram(gl, trunkVS, trunkFS);
  skyboxProgram = createProgram(gl, skyVS, skyFS);
  
  // Load textures.
  logTexture = loadTexture(gl, "logtexture.png");
  leafTexture = loadTexture(gl, "leaftexture.png");
  skyTexture = loadCubeMapTexture(gl, "skytexture.png");
  
  // Create two trees.
  trees.push(createCherryTree([-5, -5]));
  trees.push(createCherryTree([5, 2]));
  
  // Generate grass plane as one large quad (ground is drawn by drawGround).
  
  renderScene();
}
window.onload = main;
