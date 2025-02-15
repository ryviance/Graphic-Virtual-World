// Scene.js

function createShader(gl,t,s){let sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);return gl.getShaderParameter(sh,gl.COMPILE_STATUS)?sh:(console.error(gl.getShaderInfoLog(sh)),null);}
function createProgram(gl,vs,fs){let p=gl.createProgram();gl.attachShader(p,createShader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(p,createShader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);return gl.getProgramParameter(p,gl.LINK_STATUS)?p:(console.error(gl.getProgramInfoLog(p)),null);}
var program, skyboxProgram, texProgram, skyboxTexture, trees=[];
const vsSource=`attribute vec4 a_Position;attribute vec4 a_Color;uniform mat4 u_ViewProjection;uniform mat4 u_Model;varying vec4 v_Color;void main(){gl_Position=u_ViewProjection*u_Model*a_Position;v_Color=a_Color;}`,
      fsSource=`precision mediump float;varying vec4 v_Color;void main(){gl_FragColor=v_Color;}`,
      skyVs=`attribute vec3 a_Position;varying vec3 v_TexCoord;uniform mat4 u_ViewProjection;void main(){v_TexCoord=a_Position;vec4 pos=u_ViewProjection*vec4(a_Position,1.0);gl_Position=pos.xyww;}`,
      skyFs=`precision mediump float;varying vec3 v_TexCoord;uniform samplerCube u_Skybox;void main(){gl_FragColor=textureCube(u_Skybox,v_TexCoord);}`,
      texVsSource=`attribute vec4 a_Position;attribute vec2 a_TexCoord;uniform mat4 u_ViewProjection;uniform mat4 u_Model;varying vec2 v_TexCoord;void main(){gl_Position=u_ViewProjection*u_Model*a_Position;v_TexCoord=a_TexCoord;}`,
      texFsSource=`precision mediump float;varying vec2 v_TexCoord;uniform sampler2D u_Texture;void main(){gl_FragColor=texture2D(u_Texture,v_TexCoord);}`;
function createCherryTree(b){let t={base:b,trunk:[],leaves:[]};for(let i=0;i<4;i++)t.trunk.push([b[0],i,b[1]]);for(let y=0;y<2;y++)for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)t.leaves.push([b[0]+x,4+y,b[1]+z]);return t;}
function drawCherryTree(gl,prog,t){
  for(let i=0;i<t.trunk.length;i++){
    let m=mat4.create();
    mat4.translate(m,m,t.trunk[i]);
    // Draw trunk cube in brown
    drawColoredCube(gl,prog,m,[0.55,0.27,0.07,1]);
  }
  for(let i=0;i<t.leaves.length;i++){
    let m=mat4.create();
    mat4.translate(m,m,t.leaves[i]);
    // Draw leaf cube in pink
    drawColoredCube(gl,prog,m,[1,0.75,0.8,1]);
  }
}
function renderScene(){
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  let vp=updateCamera(gl,program,canvas);
  let skyView=mat4.clone(vp.view); skyView[12]=skyView[13]=skyView[14]=0;
  let skyVP=mat4.create(); mat4.multiply(skyVP,vp.proj,skyView);
  gl.useProgram(skyboxProgram);
  gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProgram,"u_ViewProjection"),false,skyVP);
  drawTexturedSkybox(gl,skyboxProgram,50,skyboxTexture);
  gl.useProgram(program);
  // Draw ground as a double-sided green quad.
  drawColoredQuad(gl,program,mat4.create(),[0,0.8,0,1]);
  // Draw trees.
  for(let i=0;i<trees.length;i++){ drawCherryTree(gl,program,trees[i]); }
  requestAnimationFrame(renderScene);
}
function main(){
  canvas=document.getElementById("webgl");
  if(!canvas)return console.error("No canvas");
  gl=canvas.getContext("webgl");
  if(!gl)return console.error("No WebGL");
  gl.enable(gl.DEPTH_TEST); gl.clearColor(0,0,0,1);
  program=createProgram(gl,vsSource,fsSource);
  skyboxProgram=createProgram(gl,skyVs,skyFs);
  texProgram=createProgram(gl,texVsSource,texFsSource);
  // Position trees closer to the camera.
  trees.push(createCherryTree([-5,-5]));
  trees.push(createCherryTree([5,2]));
  skyboxTexture=loadCubeMapTexture(gl,"skytexture.png");
  renderScene();
}
window.onload=main;