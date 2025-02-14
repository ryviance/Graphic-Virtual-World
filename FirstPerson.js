var gl, program, canvas, skyboxProgram, skyboxTexture;
var camPos = [0,1.5,5], camRot = 0, tarRot = 0, camPitch = -30, tarPitch = -30;
var isMoving = {w:false,a:false,s:false,d:false,space:false,shift:false,q:false,e:false}, isDragging=false;
var lastX = 0, lastY = 0, mSens = 0.2, mSpeed = 1, tSpeed = 1.5;
var rotLerp = 0.1, movLerp = 0.1;
var blockPos = [];

const vsSource = `attribute vec4 a_Position;attribute vec4 a_Color;uniform mat4 u_ViewProjection;uniform mat4 u_Model;varying vec4 v_Color;void main(){gl_Position=u_ViewProjection*u_Model*a_Position;v_Color=a_Color;}`;
const fsSource = `precision mediump float;varying vec4 v_Color;void main(){gl_FragColor=v_Color;}`;
const skyVs = `attribute vec3 a_Position;varying vec3 v_TexCoord;uniform mat4 u_ViewProjection;void main(){v_TexCoord=a_Position;vec4 pos=u_ViewProjection*vec4(a_Position,1.0);gl_Position=pos.xyww;}`;
const skyFs = `precision mediump float;varying vec3 v_TexCoord;uniform samplerCube u_Skybox;void main(){gl_FragColor=textureCube(u_Skybox,v_TexCoord);}`;

function createShader(gl, type, src){let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.error(gl.getShaderInfoLog(s));return null;}return s;}
function createProgram(gl, vs, fs){let p=gl.createProgram();gl.attachShader(p,createShader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(p,createShader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS)){console.error(gl.getProgramInfoLog(p));return null;}return p;}

function loadCubeMapTexture(gl, url) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
  const faces = [
    gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
    gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
    gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
  ];
  faces.forEach(f=>gl.texImage2D(f,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,255,255])));
  let img = new Image();
  img.src = url;
  img.onload = function(){
    faces.forEach(f=>{
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
      gl.texImage2D(f,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
    });
    gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  };
  gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  return tex;
}

function updateCamera(){
  camRot += (tarRot-camRot)*rotLerp;
  camPitch += (tarPitch-camPitch)*rotLerp;
  let yaw = camRot*Math.PI/180, pitch = camPitch*Math.PI/180;
  let dx=0,dz=0,dy=0;
  if(isMoving.q) tarRot -= tSpeed;
  if(isMoving.e) tarRot += tSpeed;
  if(isMoving.w){dx+=mSpeed*Math.sin(yaw);dz-=mSpeed*Math.cos(yaw);}
  if(isMoving.s){dx-=mSpeed*Math.sin(yaw);dz+=mSpeed*Math.cos(yaw);}
  if(isMoving.a){dx-=mSpeed*Math.cos(yaw);dz-=mSpeed*Math.sin(yaw);}
  if(isMoving.d){dx+=mSpeed*Math.cos(yaw);dz+=mSpeed*Math.sin(yaw);}
  if(isMoving.space) dy+=mSpeed; if(isMoving.shift) dy-=mSpeed;
  camPos[0]+=dx*movLerp; camPos[1]+=dy*movLerp; camPos[2]+=dz*movLerp;
  let lookAt = [camPos[0]+Math.sin(yaw)*Math.cos(pitch),
                camPos[1]+Math.sin(pitch),
                camPos[2]-Math.cos(yaw)*Math.cos(pitch)];
  let view = mat4.create(); mat4.lookAt(view, camPos, lookAt, [0,1,0]);
  let proj = mat4.create(); mat4.perspective(proj, Math.PI/3, canvas.width/canvas.height,0.1,1000);
  let vp = mat4.create(); mat4.multiply(vp, proj, view);
  gl.uniformMatrix4fv(gl.getUniformLocation(program,"u_ViewProjection"), false, vp);
  return {proj:proj, view:view};
}

["keydown","keyup"].forEach(e=>document.addEventListener(e,ev=>{
  let k=ev.key.toLowerCase(); if(k===" ") k="space"; isMoving[k]=(e==="keydown");
}));
["mousedown","mousemove","mouseup"].forEach(e=>document.addEventListener(e,ev=>{
  if(e==="mousedown"){ isDragging=true; lastX=ev.clientX; lastY=ev.clientY; }
  else if(e==="mousemove"&&isDragging){ let dx=ev.clientX-lastX, dy=ev.clientY-lastY;
    tarRot+=dx*mSens; tarPitch-=dy*mSens; tarPitch=Math.max(-90,Math.min(90,tarPitch));
    lastX=ev.clientX; lastY=ev.clientY;
  } else if(e==="mouseup") isDragging=false;
}));

// Cache skybox buffers so they aren't recreated every frame
let skyVBuf = null, skyIBuf = null, skyIndCount = 0;
function initSkyboxBuffers(gl) {
  const verts = new Float32Array([
    -1,-1, 1,  1,-1, 1,  1,1, 1,  -1,1, 1,
    -1,-1,-1,  1,-1,-1,  1,1,-1,  -1,1,-1
  ]);
  const inds = new Uint16Array([
    0,1,2, 0,2,3,  4,5,6, 4,6,7,  0,3,7, 0,7,4,
    1,5,6, 1,6,2,  3,2,6, 3,6,7,  0,1,5, 0,5,4
  ]);
  skyVBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, skyVBuf);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  skyIBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyIBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, inds, gl.STATIC_DRAW);
  skyIndCount = inds.length;
}

function drawTexturedSkybox(gl, prog, scale, tex){
  if(!skyVBuf || !skyIBuf) initSkyboxBuffers(gl);
  const FSIZE = 4; // assuming Float32Array (4 bytes per element)
  let aPos = gl.getAttribLocation(prog,"a_Position");
  gl.bindBuffer(gl.ARRAY_BUFFER, skyVBuf);
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, FSIZE*3, 0);
  gl.enableVertexAttribArray(aPos);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyIBuf);
  let uModel = gl.getUniformLocation(prog,"u_Model");
  let m = mat4.create();
  // Only scale; no translation.
  mat4.scale(m, m, [scale, scale, scale]);
  gl.uniformMatrix4fv(uModel, false, m);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
  gl.uniform1i(gl.getUniformLocation(prog,"u_Skybox"),0);
  gl.disable(gl.DEPTH_TEST); // disable depth testing for skybox
  gl.disable(gl.CULL_FACE);
  gl.drawElements(gl.TRIANGLES, skyIndCount, gl.UNSIGNED_SHORT, 0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
}

function renderScene(){
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  let vp = updateCamera();
  let skyView = mat4.clone(vp.view);
  skyView[12]=skyView[13]=skyView[14]=0;
  let skyVP = mat4.create();
  mat4.multiply(skyVP, vp.proj, skyView);
  gl.useProgram(skyboxProgram);
  gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProgram,"u_ViewProjection"), false, skyVP);
  drawTexturedSkybox(gl, skyboxProgram, 50, skyboxTexture);
  gl.useProgram(program);
  drawGrassBlock(gl, program);
  for(let i=0;i<blockPos.length;i++){
    let m = mat4.create();
    mat4.translate(m, m, [blockPos[i][0],0.5,blockPos[i][1]]);
    drawCube(gl, program, m);
  }
  requestAnimationFrame(renderScene);
}

function main(){
  canvas = document.getElementById("webgl");
  if(!canvas){ console.error("No canvas"); return; }
  gl = canvas.getContext("webgl");
  if(!gl){ console.error("No WebGL"); return; }
  gl.enable(gl.DEPTH_TEST); gl.clearColor(0,0,0,1);
  program = createProgram(gl, vsSource, fsSource);
  skyboxProgram = createProgram(gl, skyVs, skyFs);
  for(let i=0;i<15;i++){
    blockPos.push([Math.random()*100-50, Math.random()*100-50]);
  }
  skyboxTexture = loadCubeMapTexture(gl, "skytexture.png");
  renderScene();
}
window.onload = main;