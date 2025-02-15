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
// colorProgram for colored geometry (ground, etc.)
// trunkProgram for textured cubes (used for both trunk and leaves now)
// skyboxProgram for the skybox.
var colorProgram, trunkProgram, skyboxProgram;
var logTexture, leafTexture, skyTexture;
var trees = [];

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
// Draw a cherry tree: trunk with logTexture, leaves with leafTexture.
function drawCherryTree(gl, t) {
  // Draw trunk cubes with trunkProgram.
  gl.useProgram(trunkProgram);
  for (let i = 0; i < t.trunk.length; i++) {
    let m = mat4.create();
    mat4.translate(m, m, t.trunk[i]);
    drawTexturedCube(gl, trunkProgram, m, logTexture);
  }
  // Draw leaf cubes with trunkProgram using leafTexture.
  gl.useProgram(trunkProgram);
  for (let i = 0; i < t.leaves.length; i++) {
    let m = mat4.create();
    mat4.translate(m, m, t.leaves[i]);
    drawTexturedCube(gl, trunkProgram, m, leafTexture);
  }
}

function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  // Update camera (updateCamera from Camera.js should return an object with proj and view)
  let vp = updateCamera(gl, colorProgram, canvas);
  // Create combined VP matrix
  let vpMatrix = mat4.create();
  mat4.multiply(vpMatrix, vp.proj, vp.view);
  
  // For skybox, remove translation from view.
  let skyView = mat4.clone(vp.view);
  skyView[12] = skyView[13] = skyView[14] = 0;
  let skyVP = mat4.create();
  mat4.multiply(skyVP, vp.proj, skyView);
  
  // Set VP for trunk and color programs.
  gl.useProgram(trunkProgram);
  gl.uniformMatrix4fv(gl.getUniformLocation(trunkProgram, "u_ViewProjection"), false, vpMatrix);
  gl.useProgram(colorProgram);
  gl.uniformMatrix4fv(gl.getUniformLocation(colorProgram, "u_ViewProjection"), false, vpMatrix);
  
  // Draw skybox.
  gl.useProgram(skyboxProgram);
  gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProgram, "u_ViewProjection"), false, skyVP);
  drawTexturedSkybox(gl, skyboxProgram, 50, skyTexture);
  
  // Draw ground as a double-sided green quad.
  gl.useProgram(colorProgram);
  drawColoredQuad(gl, colorProgram, mat4.create(), [0, 0.8, 0, 1]);
  
  // Draw trees.
  for (let i = 0; i < trees.length; i++) {
    drawCherryTree(gl, trees[i]);
  }
  
  requestAnimationFrame(renderScene);
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
  
  // Create trees near the origin.
  trees.push(createCherryTree([-5, -5]));
  trees.push(createCherryTree([5, 2]));
  
  renderScene();
}
window.onload = main;