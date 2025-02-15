// Cube.js

// -- Skybox Texture Loader Only --
function loadCubeMapTexture(gl,url){
  const tex=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP,tex);
  const faces=[gl.TEXTURE_CUBE_MAP_POSITIVE_X,gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
               gl.TEXTURE_CUBE_MAP_POSITIVE_Y,gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
               gl.TEXTURE_CUBE_MAP_POSITIVE_Z,gl.TEXTURE_CUBE_MAP_NEGATIVE_Z];
  faces.forEach(f=>{
    gl.texImage2D(f,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,255,255]));
  });
  const img=new Image();img.src=url;
  img.onload=function(){
    faces.forEach(f=>{
      gl.bindTexture(gl.TEXTURE_CUBE_MAP,tex);
      gl.texImage2D(f,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
    });
    gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  };
  gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  return tex;
}

// -- Draw a double-sided colored quad (for ground) --
function drawColoredQuad(gl,prog,m,col){
  // 4 positions only
  const verts=new Float32Array([
    -100,0,-100,  100,0,-100,  100,0,100,  -100,0,100
  ]);
  const inds=new Uint16Array([0,1,2, 0,2,3]);
  let vb=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,vb);
  gl.bufferData(gl.ARRAY_BUFFER,verts,gl.STATIC_DRAW);
  let aPos=gl.getAttribLocation(prog,"a_Position");
  gl.vertexAttribPointer(aPos,3,gl.FLOAT,false,0,0);
  gl.enableVertexAttribArray(aPos);
  let aCol=gl.getAttribLocation(prog,"a_Color");
  gl.disableVertexAttribArray(aCol);
  gl.vertexAttrib4f(aCol,col[0],col[1],col[2],col[3]);
  let ib=gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,inds,gl.STATIC_DRAW);
  gl.uniformMatrix4fv(gl.getUniformLocation(prog,"u_Model"),false,m||mat4.create());
  gl.disable(gl.CULL_FACE);  // double-sided
  gl.drawElements(gl.TRIANGLES,inds.length,gl.UNSIGNED_SHORT,0);
  gl.enable(gl.CULL_FACE);
}

// -- Draw a double-sided colored cube (unit size, -0.5..+0.5) --
function drawColoredCube(gl,prog,m,col){
  // 8 positions only
  const verts=new Float32Array([
    // front face
    -0.5,-0.5, 0.5,
     0.5,-0.5, 0.5,
     0.5, 0.5, 0.5,
    -0.5, 0.5, 0.5,
    // back face
    -0.5,-0.5,-0.5,
     0.5,-0.5,-0.5,
     0.5, 0.5,-0.5,
    -0.5, 0.5,-0.5
  ]);
  const inds=new Uint16Array([
    // front
    0,1,2, 0,2,3,
    // back
    4,5,6, 4,6,7,
    // left
    0,3,7, 0,7,4,
    // right
    1,5,6, 1,6,2,
    // top
    3,2,6, 3,6,7,
    // bottom
    0,1,5, 0,5,4
  ]);
  let vb=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,vb);
  gl.bufferData(gl.ARRAY_BUFFER,verts,gl.STATIC_DRAW);
  let aPos=gl.getAttribLocation(prog,"a_Position");
  gl.vertexAttribPointer(aPos,3,gl.FLOAT,false,0,0);
  gl.enableVertexAttribArray(aPos);
  let aCol=gl.getAttribLocation(prog,"a_Color");
  gl.disableVertexAttribArray(aCol);
  gl.vertexAttrib4f(aCol,col[0],col[1],col[2],col[3]);
  let ib=gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,inds,gl.STATIC_DRAW);
  gl.uniformMatrix4fv(gl.getUniformLocation(prog,"u_Model"),false,m||mat4.create());
  gl.disable(gl.CULL_FACE);  // double-sided
  gl.drawElements(gl.TRIANGLES,inds.length,gl.UNSIGNED_SHORT,0);
  gl.enable(gl.CULL_FACE);
}

// -- Skybox
var skyVBuf=null, skyIBuf=null, skyIndCount=0;
function initSkyboxBuffers(gl){
  const verts=new Float32Array([
    -1,-1,1,1,-1,1,1,1,1,-1,1,1,
    -1,-1,-1,1,-1,-1,1,1,-1,-1,1,-1
  ]);
  const inds=new Uint16Array([
    0,1,2,0,2,3,4,5,6,4,6,7,
    0,3,7,0,7,4,1,5,6,1,6,2,
    3,2,6,3,6,7,0,1,5,0,5,4
  ]);
  skyVBuf=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,skyVBuf);
  gl.bufferData(gl.ARRAY_BUFFER,verts,gl.STATIC_DRAW);
  skyIBuf=gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,skyIBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,inds,gl.STATIC_DRAW);
  skyIndCount=inds.length;
}
function drawTexturedSkybox(gl,prog,scale,tex){
  if(!skyVBuf||!skyIBuf) initSkyboxBuffers(gl);
  let aPos=gl.getAttribLocation(prog,"a_Position");
  gl.bindBuffer(gl.ARRAY_BUFFER,skyVBuf);
  gl.vertexAttribPointer(aPos,3,gl.FLOAT,false,0,0);
  gl.enableVertexAttribArray(aPos);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,skyIBuf);
  let m=mat4.create(); mat4.scale(m,m,[scale,scale,scale]);
  gl.uniformMatrix4fv(gl.getUniformLocation(prog,"u_Model"),false,m);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP,tex);
  gl.uniform1i(gl.getUniformLocation(prog,"u_Skybox"),0);
  gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
  gl.drawElements(gl.TRIANGLES,skyIndCount,gl.UNSIGNED_SHORT,0);
  gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE);
}