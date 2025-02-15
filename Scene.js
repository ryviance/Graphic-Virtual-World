// Scene.js

function createShader(gl, t, s){
  let sh=gl.createShader(t);
  gl.shaderSource(sh,s);
  gl.compileShader(sh);
  return gl.getShaderParameter(sh,gl.COMPILE_STATUS)?sh:(console.error(gl.getShaderInfoLog(sh)),null);
}
function createProgram(gl,vs,fs){
  let p=gl.createProgram();
  gl.attachShader(p,createShader(gl,gl.VERTEX_SHADER,vs));
  gl.attachShader(p,createShader(gl,gl.FRAGMENT_SHADER,fs));
  gl.linkProgram(p);
  return gl.getProgramParameter(p,gl.LINK_STATUS)?p:(console.error(gl.getProgramInfoLog(p)),null);
}

var colorProgram, trunkProgram, skyboxProgram;
var logTexture, skyTexture;
var trees=[];

const colorVS=`
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
const colorFS=`
  precision mediump float;
  varying vec4 v_Color;
  void main(){
    gl_FragColor = v_Color;
  }
`;
const trunkVS=`
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
const trunkFS=`
  precision mediump float;
  varying vec2 v_TexCoord;
  uniform sampler2D u_Texture;
  void main(){
    gl_FragColor = texture2D(u_Texture, v_TexCoord);
  }
`;
const skyVS=`
  attribute vec3 a_Position;
  uniform mat4 u_ViewProjection;
  varying vec3 v_TexCoord;
  void main(){
    v_TexCoord = a_Position;
    gl_Position = u_ViewProjection * vec4(a_Position,1.0);
  }
`;
const skyFS=`
  precision mediump float;
  varying vec3 v_TexCoord;
  uniform samplerCube u_Skybox;
  void main(){
    gl_FragColor = textureCube(u_Skybox, v_TexCoord);
  }
`;

function createCherryTree(b){
  let t={ trunk:[], leaves:[] };
  for(let i=0;i<4;i++){
    t.trunk.push([b[0], i, b[1]]);
  }
  for(let y=0;y<2;y++){
    for(let x=-1;x<=1;x++){
      for(let z=-1;z<=1;z++){
        t.leaves.push([b[0]+x,4+y,b[1]+z]);
      }
    }
  }
  return t;
}

// We'll pass the camera matrix to both trunkProgram and colorProgram
function setCameraMatrix(gl, program, vpMatrix){
  gl.useProgram(program);
  let locVP = gl.getUniformLocation(program,"u_ViewProjection");
  gl.uniformMatrix4fv(locVP,false,vpMatrix);
}

// Draw trunk with trunkProgram, leaves with colorProgram
function drawCherryTree(gl, t){
  // trunk
  gl.useProgram(trunkProgram);
  for(let i=0;i<t.trunk.length;i++){
    let m=mat4.create();
    mat4.translate(m,m,t.trunk[i]);
    drawTexturedCube(gl,trunkProgram,m,logTexture);
  }
  // leaves
  gl.useProgram(colorProgram);
  for(let i=0;i<t.leaves.length;i++){
    let m=mat4.create();
    mat4.translate(m,m,t.leaves[i]);
    drawColoredCube(gl,colorProgram,m,[1,0.75,0.8,1]);
  }
}

function renderScene(){
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

  // 1) Update camera with ANY program (just to get the matrices).
  //    We'll store them in an object or global var. Suppose updateCamera returns {proj, view} or similar.
  let vp = updateCamera(gl, colorProgram, canvas);

  // 2) Multiply to get a single 4x4 vpMatrix
  let vpMatrix=mat4.create();
  mat4.multiply(vpMatrix,vp.proj,vp.view);

  // 3) Set the same matrix for trunkProgram and colorProgram
  setCameraMatrix(gl, trunkProgram, vpMatrix);
  setCameraMatrix(gl, colorProgram, vpMatrix);

  // 4) Remove translation from view for skybox
  let skyView=mat4.clone(vp.view);
  skyView[12]=skyView[13]=skyView[14]=0;
  let skyVP=mat4.create();
  mat4.multiply(skyVP,vp.proj,skyView);

  // 5) Draw skybox
  gl.useProgram(skyboxProgram);
  gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProgram,"u_ViewProjection"),false,skyVP);
  drawTexturedSkybox(gl,skyboxProgram,50,skyTexture);

  // 6) Draw ground with colorProgram
  gl.useProgram(colorProgram);
  drawColoredQuad(gl,colorProgram,mat4.create(),[0,0.8,0,1]);

  // 7) Draw trees
  for(let i=0;i<trees.length;i++){
    drawCherryTree(gl,trees[i]);
  }

  requestAnimationFrame(renderScene);
}

function main(){
  canvas=document.getElementById("webgl");
  if(!canvas)return console.error("No canvas");
  gl=canvas.getContext("webgl");
  if(!gl)return console.error("No WebGL");
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0,0,0,1);

  // create programs
  colorProgram=createProgram(gl,colorVS,colorFS);
  trunkProgram=createProgram(gl,trunkVS,trunkFS);
  skyboxProgram=createProgram(gl,skyVS,skyFS);

  // load textures
  logTexture=loadTexture(gl,"logtexture.png");
  skyTexture=loadCubeMapTexture(gl,"skytexture.png");

  // create some trees near origin
  trees.push(createCherryTree([-5,-5]));
  trees.push(createCherryTree([5,2]));

  renderScene();
}
window.onload=main;