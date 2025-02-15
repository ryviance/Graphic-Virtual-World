// Scene.js

// Make sure Cube.js, Camera.js, and Tree.js are loaded before this file.

function createShader(gl, type, source) {
  var sh = gl.createShader(type);
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

function createProgram(gl, vsSource, fsSource) {
  var vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
  var fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  var p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(p));
    return null;
  }
  return p;
}

// Global shader programs.
var colorProgram, trunkProgram, skyboxProgram;
// Global textures.
var cobblestoneTexture, logTexture, leafTexture, skyTexture;
// Global arrays for trees and dynamic (placed) blocks.
var trees = [];
var dynamicBlocks = {};

// Shader source strings.
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

// ---------- Ground ----------
// Draw a flat colored quad (green) as the ground using the preallocated quad buffers from Cube.js.
function drawGround(gl, prog) {
  var m = mat4.create();
  // This draws a 200x200 plane at y=0.
  drawColoredQuad(gl, prog, m, [0, 0.8, 0, 1]);
}

// ---------- Raycasting and Block Placement ----------

function raycastBlock() {
  var yaw = camRot * Math.PI / 180;
  var pitch = camPitch * Math.PI / 180;
  var dir = [
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch)
  ];
  var pos = camPos.slice();
  var cell = pos.map(Math.floor);
  var step = [0, 0, 0], tMax = [0, 0, 0], tDelta = [0, 0, 0];
  for (var i = 0; i < 3; i++) {
    if (dir[i] > 0) {
      step[i] = 1;
      tMax[i] = ((cell[i] + 1) - pos[i]) / dir[i];
    } else if (dir[i] < 0) {
      step[i] = -1;
      tMax[i] = (pos[i] - cell[i]) / -dir[i];
    } else {
      step[i] = 0;
      tMax[i] = Infinity;
    }
    tDelta[i] = (dir[i] !== 0) ? Math.abs(1 / dir[i]) : Infinity;
  }
  var maxDist = 10;
  var faceNormal = [0, 0, 0];
  while (true) {
    var key = cell.join(",");
    if (dynamicBlocks[key]) {
      if (tMax[0] < tMax[1] && tMax[0] < tMax[2])
        faceNormal = [-step[0], 0, 0];
      else if (tMax[1] < tMax[2])
        faceNormal = [0, -step[1], 0];
      else
        faceNormal = [0, 0, -step[2]];
      return { cell: cell.slice(), face: faceNormal, type: "dynamic" };
    }
    for (var ti = 0; ti < trees.length; ti++) {
      var tree = trees[ti];
      for (var j = 0; j < tree.trunk.length; j++) {
        if (tree.trunk[j].map(Math.floor).join(",") === key) {
          if (tMax[0] < tMax[1] && tMax[0] < tMax[2])
            faceNormal = [-step[0], 0, 0];
          else if (tMax[1] < tMax[2])
            faceNormal = [0, -step[1], 0];
          else
            faceNormal = [0, 0, -step[2]];
          return { cell: cell.slice(), face: faceNormal, tree: tree, blockType: "trunk", index: j };
        }
      }
      for (var j = 0; j < tree.leaves.length; j++) {
        if (tree.leaves[j].map(Math.floor).join(",") === key) {
          if (tMax[0] < tMax[1] && tMax[0] < tMax[2])
            faceNormal = [-step[0], 0, 0];
          else if (tMax[1] < tMax[2])
            faceNormal = [0, -step[1], 0];
          else
            faceNormal = [0, 0, -step[2]];
          return { cell: cell.slice(), face: faceNormal, tree: tree, blockType: "leaves", index: j };
        }
      }
    }
    if (tMax[0] < tMax[1] && tMax[0] < tMax[2]) {
      if (tMax[0] > maxDist) break;
      cell[0] += step[0];
      tMax[0] += tDelta[0];
    } else if (tMax[1] < tMax[2]) {
      if (tMax[1] > maxDist) break;
      cell[1] += step[1];
      tMax[1] += tDelta[1];
    } else {
      if (tMax[2] > maxDist) break;
      cell[2] += step[2];
      tMax[2] += tDelta[2];
    }
  }
  return null;
}

function isCellOccupied(cell) {
  var key = cell.join(",");
  if (dynamicBlocks[key]) return true;
  for (var i = 0; i < trees.length; i++) {
    var t = trees[i];
    for (var j = 0; j < t.trunk.length; j++) {
      if (t.trunk[j].map(Math.floor).join(",") === key) return true;
    }
    for (var j = 0; j < t.leaves.length; j++) {
      if (t.leaves[j].map(Math.floor).join(",") === key) return true;
    }
  }
  return false;
}

// ---------- Block Placement/Removal ----------

document.getElementById("webgl").addEventListener("mousedown", function(e) {
  e.preventDefault();
  var hit = raycastBlock();
  if (e.button === 0 && hit) {
    // Left-click: remove block.
    if (hit.tree) {
      if (hit.blockType === "trunk")
        hit.tree.trunk.splice(hit.index, 1);
      else
        hit.tree.leaves.splice(hit.index, 1);
    } else {
      delete dynamicBlocks[hit.cell.join(",")];
    }
  } else if (e.button === 2) {
    // Right-click: place block.
    var cell;
    if (hit) {
      var n = hit.face;
      cell = [hit.cell[0] - n[0], hit.cell[1] - n[1], hit.cell[2] - n[2]];
    } else {
      var yaw = camRot * Math.PI / 180, pitch = camPitch * Math.PI / 180;
      cell = [
        Math.floor(camPos[0] + Math.sin(yaw) * Math.cos(pitch) * 5),
        Math.floor(camPos[1] + Math.sin(pitch) * 5),
        Math.floor(camPos[2] - Math.cos(yaw) * Math.cos(pitch) * 5)
      ];
    }
    if (!isCellOccupied(cell)) {
      dynamicBlocks[cell.join(",")] = true;
    }
  }
});
document.getElementById("webgl").addEventListener("contextmenu", function(e) {
  e.preventDefault();
});

// ---------- Render Loop ----------

function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var vp = updateCamera(gl, colorProgram, canvas);
  var vpMatrix = mat4.create();
  mat4.multiply(vpMatrix, vp.proj, vp.view);

  var skyView = mat4.clone(vp.view);
  skyView[12] = skyView[13] = skyView[14] = 0;
  var skyVP = mat4.create();
  mat4.multiply(skyVP, vp.proj, skyView);

  // Set VP for trunkProgram and colorProgram.
  gl.useProgram(trunkProgram);
  var locTP = gl.getUniformLocation(trunkProgram, "u_ViewProjection");
  gl.uniformMatrix4fv(locTP, false, vpMatrix);

  gl.useProgram(colorProgram);
  var locCP = gl.getUniformLocation(colorProgram, "u_ViewProjection");
  gl.uniformMatrix4fv(locCP, false, vpMatrix);

  // Draw skybox.
  gl.useProgram(skyboxProgram);
  var locSP = gl.getUniformLocation(skyboxProgram, "u_ViewProjection");
  gl.uniformMatrix4fv(locSP, false, skyVP);
  drawTexturedSkybox(gl, skyboxProgram, 50, skyTexture);

  // Draw ground.
  gl.useProgram(colorProgram);
  drawGround(gl, colorProgram);

  // Draw dynamic blocks (placed cubes) using the cobblestone texture.
  gl.useProgram(trunkProgram);
  for (var key in dynamicBlocks) {
    var parts = key.split(",").map(Number);
    var m = mat4.fromTranslation(mat4.create(), [parts[0], parts[1] + 0.5, parts[2]]);
    drawTexturedCube(gl, trunkProgram, m, cobblestoneTexture);
  }

  // Draw trees.
  for (var i = 0; i < trees.length; i++) {
    // drawCherryTree is defined in Tree.js.
    drawCherryTree(gl, trees[i]);
  }

  updateFPS();
  requestAnimationFrame(renderScene);
}

var lastTime = 0, frameCount = 0;
function updateFPS() {
  var now = performance.now();
  frameCount++;
  if (now - lastTime >= 1000) {
    var fps = (frameCount * 1000 / (now - lastTime)).toFixed(1);
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

  colorProgram = createProgram(gl, colorVS, colorFS);
  trunkProgram = createProgram(gl, trunkVS, trunkFS);
  skyboxProgram = createProgram(gl, skyVS, skyFS);

  // Load textures.
  mossTexture = loadTexture(gl, "mosstexture.png"); // Not used in ground now.
  cobblestoneTexture = loadTexture(gl, "cobblestonetexture.png");
  logTexture = loadTexture(gl, "logtexture.png");
  leafTexture = loadTexture(gl, "leaftexture.png");
  skyTexture = loadCubeMapTexture(gl, "skytexture.png");

  // Add fancy trees.
  trees.push(createFancyCherryTree1([-10, -5]));
  trees.push(createFancyCherryTree2([0, -10]));
  trees.push(createFancyCherryTree3([8, 3]));

  renderScene();
}
window.onload = main;
