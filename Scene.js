// Scene.js

function createShader(gl, type, src) {
  let sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}
function createProgram(gl, vsSrc, fsSrc) {
  let vs = createShader(gl, gl.VERTEX_SHADER, vsSrc);
  let fs = createShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  let prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(prog));
    return null;
  }
  return prog;
}

var colorProgram, trunkProgram, skyboxProgram;
var cobblestoneTexture, logTexture, leafTexture, skyTexture;
var trees = [];
var toriiGates = [];
var dynamicBlocks = {};

const colorVS = `
  attribute vec4 a_Position;
  attribute vec4 a_Color;
  attribute vec2 a_TexCoord;
  uniform mat4 u_ViewProjection;
  uniform mat4 u_Model;
  varying vec4 v_Color;
  void main(){ gl_Position = u_ViewProjection*u_Model*a_Position; v_Color = a_Color; }
`;
const colorFS = `
  precision mediump float;
  varying vec4 v_Color;
  void main(){ gl_FragColor = v_Color; }
`;
const trunkVS = `
  attribute vec4 a_Position;
  attribute vec2 a_TexCoord;
  uniform mat4 u_ViewProjection;
  uniform mat4 u_Model;
  varying vec2 v_TexCoord;
  void main(){ gl_Position = u_ViewProjection*u_Model*a_Position; v_TexCoord = a_TexCoord; }
`;
const trunkFS = `
  precision mediump float;
  varying vec2 v_TexCoord;
  uniform sampler2D u_Texture;
  void main(){ gl_FragColor = texture2D(u_Texture, v_TexCoord); }
`;
const skyVS = `
  attribute vec3 a_Position;
  uniform mat4 u_ViewProjection;
  varying vec3 v_TexCoord;
  void main(){ v_TexCoord = a_Position; gl_Position = u_ViewProjection*vec4(a_Position,1.0); }
`;
const skyFS = `
  precision mediump float;
  varying vec3 v_TexCoord;
  uniform samplerCube u_Skybox;
  void main(){ gl_FragColor = textureCube(u_Skybox,v_TexCoord); }
`;

function drawGround(gl, prog) {
  let m = mat4.create();
  drawColoredQuad(gl, prog, m, [0,0.8,0,1]);
}

function isCellOccupied(cell) {
  let key = cell.join(",");
  if(dynamicBlocks[key]) return true;
  for(let i=0;i<trees.length;i++){
    let t = trees[i];
    for(let j=0;j<t.trunk.length;j++){
      if(t.trunk[j].map(Math.floor).join(",")===key)return true;
    }
    for(let j=0;j<t.leaves.length;j++){
      if(t.leaves[j].map(Math.floor).join(",")===key)return true;
    }
  }
  for(let i=0;i<toriiGates.length;i++){
    let gate = toriiGates[i];
    let parts = gate.blackFeet.concat(gate.redPillars, gate.crossbeams, gate.roof);
    for(let j=0;j<parts.length;j++){
      if(parts[j].map(Math.floor).join(",")===key)return true;
    }
  }
  return false;
}

function raycastBlock() {
  let yaw = camRot*Math.PI/180, pitch = camPitch*Math.PI/180;
  let dir = [ Math.sin(yaw)*Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw)*Math.cos(pitch) ];
  let pos = camPos.slice(), cell = pos.map(Math.floor);
  let step = [0,0,0], tMax = [0,0,0], tDelta = [0,0,0];
  for(let i=0;i<3;i++){
    if(dir[i]>0){ step[i]=1; tMax[i]=((cell[i]+1)-pos[i])/dir[i]; }
    else if(dir[i]<0){ step[i]=-1; tMax[i]=(pos[i]-cell[i])/-dir[i]; }
    else{ step[i]=0; tMax[i]=Infinity; }
    tDelta[i]=(dir[i]!==0)?Math.abs(1/dir[i]):Infinity;
  }
  let maxDist = 10, faceNormal = [0,0,0];
  while(true){
    let key = cell.join(",");
    if(dynamicBlocks[key]){
      if(tMax[0]<tMax[1] && tMax[0]<tMax[2]) faceNormal = [-step[0],0,0];
      else if(tMax[1]<tMax[2]) faceNormal = [0,-step[1],0];
      else faceNormal = [0,0,-step[2]];
      return { cell: cell.slice(), face: faceNormal, type:"dynamic" };
    }
    for(let ti=0;ti<trees.length;ti++){
      let tree = trees[ti];
      for(let j=0;j<tree.trunk.length;j++){
        if(tree.trunk[j].map(Math.floor).join(",")===key){
          if(tMax[0]<tMax[1] && tMax[0]<tMax[2]) faceNormal = [-step[0],0,0];
          else if(tMax[1]<tMax[2]) faceNormal = [0,-step[1],0];
          else faceNormal = [0,0,-step[2]];
          return { cell: cell.slice(), face: faceNormal, tree, blockType:"trunk", index:j };
        }
      }
      for(let j=0;j<tree.leaves.length;j++){
        if(tree.leaves[j].map(Math.floor).join(",")===key){
          if(tMax[0]<tMax[1] && tMax[0]<tMax[2]) faceNormal = [-step[0],0,0];
          else if(tMax[1]<tMax[2]) faceNormal = [0,-step[1],0];
          else faceNormal = [0,0,-step[2]];
          return { cell: cell.slice(), face: faceNormal, tree, blockType:"leaves", index:j };
        }
      }
    }
    for(let ti=0;ti<toriiGates.length;ti++){
      let gate = toriiGates[ti];
      let parts = [
        {name:"blackFeet", arr: gate.blackFeet},
        {name:"redPillars", arr: gate.redPillars},
        {name:"crossbeams", arr: gate.crossbeams},
        {name:"roof", arr: gate.roof}
      ];
      for(let a=0;a<parts.length;a++){
        for(let j=0;j<parts[a].arr.length;j++){
          if(parts[a].arr[j].map(Math.floor).join(",")===key){
            if(tMax[0]<tMax[1] && tMax[0]<tMax[2]) faceNormal = [-step[0],0,0];
            else if(tMax[1]<tMax[2]) faceNormal = [0,-step[1],0];
            else faceNormal = [0,0,-step[2]];
            return { cell: cell.slice(), face: faceNormal, torii: gate, partArray: parts[a].name, index: j };
          }
        }
      }
    }
    if(tMax[0]<tMax[1] && tMax[0]<tMax[2]){
      if(tMax[0]>maxDist) break;
      cell[0]+=step[0]; tMax[0]+=tDelta[0];
    } else if(tMax[1]<tMax[2]){
      if(tMax[1]>maxDist) break;
      cell[1]+=step[1]; tMax[1]+=tDelta[1];
    } else {
      if(tMax[2]>maxDist) break;
      cell[2]+=step[2]; tMax[2]+=tDelta[2];
    }
  }
  return null;
}

document.getElementById("webgl").addEventListener("mousedown", function(e) {
  e.preventDefault();
  let hit = raycastBlock();
  if(e.button === 0 && hit) {
    if(hit.tree) {
      if(hit.blockType==="trunk")
        hit.tree.trunk.splice(hit.index,1);
      else
        hit.tree.leaves.splice(hit.index,1);
    } else if(hit.torii) {
      let gate = hit.torii;
      if(hit.partArray==="blackFeet") gate.blackFeet.splice(hit.index,1);
      else if(hit.partArray==="redPillars") gate.redPillars.splice(hit.index,1);
      else if(hit.partArray==="crossbeams") gate.crossbeams.splice(hit.index,1);
      else if(hit.partArray==="roof") gate.roof.splice(hit.index,1);
    } else {
      delete dynamicBlocks[hit.cell.join(",")];
    }
  } else if(e.button === 2) {
    let cell;
    if(hit) {
      let n = hit.face;
      cell = [ hit.cell[0] - n[0], hit.cell[1] - n[1], hit.cell[2] - n[2] ];
    } else {
      let yaw = camRot*Math.PI/180, pitch = camPitch*Math.PI/180;
      cell = [
        Math.floor(camPos[0] + Math.sin(yaw)*Math.cos(pitch)*5),
        Math.floor(camPos[1] + Math.sin(pitch)*5),
        Math.floor(camPos[2] - Math.cos(yaw)*Math.cos(pitch)*5)
      ];
    }
    if (cell[1] < 0) cell[1] = 0;
    if (!isCellOccupied(cell)) {
      dynamicBlocks[cell.join(",")] = true;
    }
  }
});
document.getElementById("webgl").addEventListener("contextmenu", function(e) { e.preventDefault(); });

function generateForest() {
  trees = [];
  // Generate 200 trees over area x,z ∈ [-100,100]
  for (let i = 0; i < 125; i++) {
    let x = Math.floor(Math.random() * 200 - 100);
    let z = Math.floor(Math.random() * 200 - 100);
    // Skip trees whose base is near the path (|x| < 5)
    if (Math.abs(x) < 5) continue;
    let variant = Math.floor(Math.random() * 3) + 1;
    let tree;
    if (variant === 1) tree = createFancyCherryTree1([x, z]);
    else if (variant === 2) tree = createFancyCherryTree2([x, z]);
    else tree = createFancyCherryTree3([x, z]);
    let overlap = false;
    for (let b of tree.trunk.concat(tree.leaves)) {
      let key = b.map(Math.floor).join(",");
      // Also skip trees that have any block with x in [-5,5] and z in [-40,40] (path region)
      let bx = parseInt(key.split(",")[0]);
      let bz = parseInt(key.split(",")[2]);
      if(bx >= -5 && bx <= 5 && bz >= -40 && bz <= 40) { overlap = true; break; }
      for (let j = 0; j < toriiGates.length; j++) {
        let gate = toriiGates[j];
        let gateBlocks = gate.blackFeet.concat(gate.redPillars, gate.crossbeams, gate.roof);
        if (gateBlocks.some(gb => gb.map(Math.floor).join(",") === key)) {
          overlap = true;
          break;
        }
      }
      if (overlap) break;
    }
    if (!overlap) trees.push(tree);
  }
}
function generatePathTorii() {
  toriiGates = [];
  // Path along z-axis at x=0.
  for (let z = -40; z <= 40; z += 20) {
    toriiGates.push(createTorii([0, z]));
  }
}

function drawScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  let vp = updateCamera(gl, colorProgram, canvas);
  let vpMatrix = mat4.create();
  mat4.multiply(vpMatrix, vp.proj, vp.view);

  let skyView = mat4.clone(vp.view);
  skyView[12] = skyView[13] = skyView[14] = 0;
  let skyVP = mat4.create();
  mat4.multiply(skyVP, vp.proj, skyView);

  gl.useProgram(trunkProgram);
  let locTP = gl.getUniformLocation(trunkProgram, "u_ViewProjection");
  gl.uniformMatrix4fv(locTP, false, vpMatrix);

  gl.useProgram(colorProgram);
  let locCP = gl.getUniformLocation(colorProgram, "u_ViewProjection");
  gl.uniformMatrix4fv(locCP, false, vpMatrix);

  gl.useProgram(skyboxProgram);
  let locSP = gl.getUniformLocation(skyboxProgram, "u_ViewProjection");
  gl.uniformMatrix4fv(locSP, false, skyVP);
  drawTexturedSkybox(gl, skyboxProgram, 50, skyTexture);

  gl.useProgram(colorProgram);
  drawGround(gl, colorProgram);

  gl.useProgram(trunkProgram);
  for (let key in dynamicBlocks) {
    let parts = key.split(",").map(Number);
    let m = mat4.fromTranslation(mat4.create(), [parts[0], parts[1] + 0.5, parts[2]]);
    drawTexturedCube(gl, trunkProgram, m, cobblestoneTexture);
  }

  for (let i = 0; i < trees.length; i++) {
    drawCherryTree(gl, trees[i]);
  }

  gl.useProgram(colorProgram);
  for (let i = 0; i < toriiGates.length; i++) {
    drawTorii(gl, toriiGates[i]);
  }

  updateFPS();
  requestAnimationFrame(drawScene);
}

var lastTime = 0, frameCount = 0;
function updateFPS() {
  let now = performance.now();
  frameCount++;
  if (now - lastTime >= 1000) {
    let fps = (frameCount * 1000 / (now - lastTime)).toFixed(1);
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

  cobblestoneTexture = loadTexture(gl, "cobblestonetexture.png");
  logTexture = loadTexture(gl, "logtexture.png");
  leafTexture = loadTexture(gl, "leaftexture.png");
  skyTexture = loadCubeMapTexture(gl, "skytexture.png");

  generatePathTorii();
  generateForest();
  toriiGates = [];
  for (let z = -40; z <= 40; z += 20) {
    toriiGates.push(createTorii([0, z]));
  }
  drawScene();
}
window.onload = main;
