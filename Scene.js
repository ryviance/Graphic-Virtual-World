// Scene.js

function createShader(gl, t, s) {
  let sh = gl.createShader(t);
  gl.shaderSource(sh, s);
  gl.compileShader(sh);
  return gl.getShaderParameter(sh, gl.COMPILE_STATUS)
    ? sh
    : (console.error(gl.getShaderInfoLog(sh)), null);
}
function createProgram(gl, vs, fs) {
  let p = gl.createProgram();
  gl.attachShader(p, createShader(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, createShader(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  return gl.getProgramParameter(p, gl.LINK_STATUS)
    ? p
    : (console.error(gl.getProgramInfoLog(p)), null);
}

// We'll have three programs: colorProgram (for ground), trunkProgram (for tree blocks), skyboxProgram.
var colorProgram, trunkProgram, skyboxProgram;
var logTexture, leafTexture, skyTexture;
var trees = [];
var dynamicBlocks = {}; // user-placed blocks

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

// Create a Minecraft-style cherry tree. We add +0.5 in y so the block bottom aligns with y=0.
function createCherryTree(base) {
  let t = { trunk: [], leaves: [] };
  // trunk: 4 blocks high
  for (let i = 0; i < 4; i++) {
    t.trunk.push([base[0], i + 0.5, base[1]]);
  }
  // leaves: 3×3×2 at top
  for (let y = 0; y < 2; y++) {
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        t.leaves.push([base[0] + x, 4 + y + 0.5, base[1] + z]);
      }
    }
  }
  return t;
}
// Draw a cherry tree: trunk with logTexture, leaves with leafTexture.
function drawCherryTree(gl, tree) {
  gl.useProgram(trunkProgram);
  // trunk
  for (let i = 0; i < tree.trunk.length; i++) {
    let m = mat4.create();
    mat4.translate(m, m, tree.trunk[i]);
    drawTexturedCube(gl, trunkProgram, m, logTexture);
  }
  // leaves
  for (let i = 0; i < tree.leaves.length; i++) {
    let m = mat4.create();
    mat4.translate(m, m, tree.leaves[i]);
    drawTexturedCube(gl, trunkProgram, m, leafTexture);
  }
}

// Draw the ground as one large quad covering 50×50 blocks.
function drawGround(gl, prog) {
  let m = mat4.create();
  // drawColoredQuad spans -100..+100 => 200 units
  // scale by 0.25 => 50 units
  mat4.scale(m, m, [0.25, 1, 0.25]);
  drawColoredQuad(gl, prog, m, [0, 0.8, 0, 1]);
}

// DDA-based voxel traversal to find dynamic or tree blocks.
function raycastBlock() {
  let yaw = camRot * Math.PI / 180;
  let pitch = camPitch * Math.PI / 180;
  let rayDir = [
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch)
  ];
  let pos = camPos.slice();
  let cell = pos.map(Math.floor);
  let step = [0, 0, 0];
  let tMax = [0, 0, 0];
  let tDelta = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    if (rayDir[i] > 0) {
      step[i] = 1;
      tMax[i] = ((cell[i] + 1) - pos[i]) / rayDir[i];
    } else if (rayDir[i] < 0) {
      step[i] = -1;
      tMax[i] = (pos[i] - cell[i]) / -rayDir[i];
    } else {
      step[i] = 0;
      tMax[i] = Infinity;
    }
    tDelta[i] = (rayDir[i] !== 0) ? Math.abs(1 / rayDir[i]) : Infinity;
  }
  
  let maxDist = 10;
  let faceNormal = [0, 0, 0];
  
  while (true) {
    let key = cell.join(",");
    // Check dynamic blocks
    if (dynamicBlocks[key]) {
      if (tMax[0] < tMax[1] && tMax[0] < tMax[2]) { faceNormal = [-step[0], 0, 0]; }
      else if (tMax[1] < tMax[2]) { faceNormal = [0, -step[1], 0]; }
      else { faceNormal = [0, 0, -step[2]]; }
      return { cell: cell.slice(), face: faceNormal, type: "dynamic" };
    }
    // Check tree blocks
    for (let ti = 0; ti < trees.length; ti++) {
      let tree = trees[ti];
      for (let j = 0; j < tree.trunk.length; j++) {
        if (tree.trunk[j].map(Math.floor).join(",") === key) {
          if (tMax[0] < tMax[1] && tMax[0] < tMax[2]) { faceNormal = [-step[0], 0, 0]; }
          else if (tMax[1] < tMax[2]) { faceNormal = [0, -step[1], 0]; }
          else { faceNormal = [0, 0, -step[2]]; }
          return { cell: cell.slice(), face: faceNormal, tree, blockType: "trunk", index: j };
        }
      }
      for (let j = 0; j < tree.leaves.length; j++) {
        if (tree.leaves[j].map(Math.floor).join(",") === key) {
          if (tMax[0] < tMax[1] && tMax[0] < tMax[2]) { faceNormal = [-step[0], 0, 0]; }
          else if (tMax[1] < tMax[2]) { faceNormal = [0, -step[1], 0]; }
          else { faceNormal = [0, 0, -step[2]]; }
          return { cell: cell.slice(), face: faceNormal, tree, blockType: "leaves", index: j };
        }
      }
    }
    // Step to next cell
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

// Check if a cell is already occupied by dynamic or tree blocks
function isCellOccupied(cell) {
  let key = cell.join(",");
  // We no longer block y=0. So you can place at ground level.
  if (dynamicBlocks[key]) return true;
  // check trees
  for (let i = 0; i < trees.length; i++) {
    let tree = trees[i];
    for (let j = 0; j < tree.trunk.length; j++) {
      if (tree.trunk[j].map(Math.floor).join(",") === key) return true;
    }
    for (let j = 0; j < tree.leaves.length; j++) {
      if (tree.leaves[j].map(Math.floor).join(",") === key) return true;
    }
  }
  return false;
}

// Place/destroy blocks
document.getElementById("webgl").addEventListener("mousedown", e => {
  e.preventDefault();
  let hit = raycastBlock();
  if (e.button === 0 && hit) {
    // Left-click: remove block
    if (hit.tree) {
      // remove from tree
      if (hit.blockType === "trunk") {
        hit.tree.trunk.splice(hit.index, 1);
      } else {
        hit.tree.leaves.splice(hit.index, 1);
      }
    } else {
      // remove from dynamic blocks
      delete dynamicBlocks[hit.cell.join(",")];
    }
  } else if (e.button === 2) {
    // Right-click: place block
    let cell;
    if (hit) {
      // place adjacent
      let n = hit.face;
      cell = [ hit.cell[0] - n[0], hit.cell[1] - n[1], hit.cell[2] - n[2] ];
    } else {
      // no block hit, place 5 units in front
      let yaw = camRot * Math.PI/180, pitch = camPitch * Math.PI/180;
      cell = [
        Math.floor(camPos[0] + Math.sin(yaw)*Math.cos(pitch)*5),
        Math.floor(camPos[1] + Math.sin(pitch)*5),
        Math.floor(camPos[2] - Math.cos(yaw)*Math.cos(pitch)*5)
      ];
    }
    // If not occupied, place it
    if (!isCellOccupied(cell)) {
      dynamicBlocks[cell.join(",")] = true;
    }
  }
});
document.getElementById("webgl").addEventListener("contextmenu", e => e.preventDefault());

function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  let vp = updateCamera(gl, colorProgram, canvas);
  let vpMatrix = mat4.create();
  mat4.multiply(vpMatrix, vp.proj, vp.view);
  
  // For skybox, remove translation from view
  let skyView = mat4.clone(vp.view);
  skyView[12] = skyView[13] = skyView[14] = 0;
  let skyVP = mat4.create();
  mat4.multiply(skyVP, vp.proj, skyView);
  
  // set VP for trunkProgram and colorProgram
  gl.useProgram(trunkProgram);
  gl.uniformMatrix4fv(gl.getUniformLocation(trunkProgram,"u_ViewProjection"),false,vpMatrix);
  gl.useProgram(colorProgram);
  gl.uniformMatrix4fv(gl.getUniformLocation(colorProgram,"u_ViewProjection"),false,vpMatrix);
  
  // draw skybox
  gl.useProgram(skyboxProgram);
  gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProgram,"u_ViewProjection"),false,skyVP);
  drawTexturedSkybox(gl, skyboxProgram, 50, skyTexture);
  
  // draw ground
  gl.useProgram(colorProgram);
  drawGround(gl, colorProgram);
  
  // draw dynamic blocks
  for (let key in dynamicBlocks) {
    let parts = key.split(",").map(Number);
    // offset y by +0.5 so bottom is at y=cell[1]
    let m = mat4.fromTranslation(mat4.create(), [parts[0], parts[1] + 0.5, parts[2]]);
    drawColoredCube(gl, colorProgram, m, [0.6, 0.6, 0.6, 1]);
  }
  
  // draw trees
  for (let i=0; i<trees.length; i++){
    drawCherryTree(gl, trees[i]);
  }
  
  updateFPS();
  requestAnimationFrame(renderScene);
}

// simple FPS
let lastTime=0, frameCount=0;
function updateFPS(){
  let now=performance.now();
  frameCount++;
  if(now-lastTime>=1000){
    let fps=(frameCount*1000/(now-lastTime)).toFixed(1);
    document.getElementById("fpsIndicator").innerText="FPS: "+fps;
    lastTime=now; frameCount=0;
  }
}

function main(){
  canvas=document.getElementById("webgl");
  if(!canvas)return console.error("No canvas");
  gl=canvas.getContext("webgl");
  if(!gl)return console.error("No WebGL");
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0,0,0,1);
  
  colorProgram=createProgram(gl,colorVS,colorFS);
  trunkProgram=createProgram(gl,trunkVS,trunkFS);
  skyboxProgram=createProgram(gl,skyVS,skyFS);
  
  logTexture=loadTexture(gl,"logtexture.png");
  leafTexture=loadTexture(gl,"leaftexture.png");
  skyTexture=loadCubeMapTexture(gl,"skytexture.png");
  
  // create a couple trees
  trees.push(createCherryTree([-5,-5]));
  trees.push(createCherryTree([5,2]));
  
  renderScene();
}
window.onload=main;
