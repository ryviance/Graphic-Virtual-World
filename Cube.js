// Cube.js

// -- Load a single PNG into a cube map (skybox) --
function loadCubeMapTexture(gl, url) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
  const faces = [
    gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
    gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
    gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
  ];
  // Temporary 1×1 pixel for each face.
  faces.forEach(face => {
    gl.texImage2D(face, 0, gl.RGBA, 1, 1, 0,
                  gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,255,255]));
  });
  const img = new Image();
  img.src = url;
  img.onload = function() {
    faces.forEach(face => {
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
      gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    });
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  };
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

// -- Load a 2D texture from a PNG --
function loadTexture(gl, url) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  // 1×1 blue pixel placeholder
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
                gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,255,255]));
  const img = new Image();
  img.src = url;
  img.onload = function() {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  };
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

/* ---------------------------
   Preallocated Buffers
   --------------------------- */

// 1) Colored Cube Buffers (3 floats per vertex, 8 vertices, 12 triangles)
var cubeColoredVB = null, cubeColoredIB = null, cubeColoredIndexCount = 0;
function initCubeColoredBuffers(gl) {
  const verts = new Float32Array([
    // front face
    -0.5, -0.5,  0.5,
     0.5, -0.5,  0.5,
     0.5,  0.5,  0.5,
    -0.5,  0.5,  0.5,
    // back face
     0.5, -0.5, -0.5,
    -0.5, -0.5, -0.5,
    -0.5,  0.5, -0.5,
     0.5,  0.5, -0.5
  ]);
  const inds = new Uint16Array([
    0,1,2, 0,2,3,
    4,5,6, 4,6,7,
    0,3,5, 3,6,5,
    1,4,7, 1,7,2,
    3,2,7, 3,7,6,
    0,5,1, 5,4,1
  ]);
  cubeColoredVB = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeColoredVB);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  cubeColoredIB = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeColoredIB);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, inds, gl.STATIC_DRAW);
  cubeColoredIndexCount = inds.length;
}

// 2) Textured Cube Buffers (5 floats per vertex, 24 vertices)
var cubeTexturedVB = null, cubeTexturedIB = null, cubeTexturedIndexCount = 0;
function initCubeTexturedBuffers(gl) {
  const verts = new Float32Array([
    // front face
    -0.5,-0.5, 0.5, 0,0,
     0.5,-0.5, 0.5, 1,0,
     0.5, 0.5, 0.5, 1,1,
    -0.5, 0.5, 0.5, 0,1,
    // back face
     0.5,-0.5,-0.5, 0,0,
    -0.5,-0.5,-0.5, 1,0,
    -0.5, 0.5,-0.5, 1,1,
     0.5, 0.5,-0.5, 0,1,
    // left face
    -0.5,-0.5,-0.5, 0,0,
    -0.5,-0.5, 0.5, 1,0,
    -0.5, 0.5, 0.5, 1,1,
    -0.5, 0.5,-0.5, 0,1,
    // right face
     0.5,-0.5, 0.5, 0,0,
     0.5,-0.5,-0.5, 1,0,
     0.5, 0.5,-0.5, 1,1,
     0.5, 0.5, 0.5, 0,1,
    // top face
    -0.5, 0.5, 0.5, 0,0,
     0.5, 0.5, 0.5, 1,0,
     0.5, 0.5,-0.5, 1,1,
    -0.5, 0.5,-0.5, 0,1,
    // bottom face
    -0.5,-0.5,-0.5, 0,0,
     0.5,-0.5,-0.5, 1,0,
     0.5,-0.5, 0.5, 1,1,
    -0.5,-0.5, 0.5, 0,1
  ]);
  const inds = new Uint16Array([
    0,1,2, 0,2,3,
    4,5,6, 4,6,7,
    8,9,10, 8,10,11,
    12,13,14, 12,14,15,
    16,17,18, 16,18,19,
    20,21,22, 20,22,23
  ]);
  cubeTexturedVB = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTexturedVB);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  cubeTexturedIB = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTexturedIB);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, inds, gl.STATIC_DRAW);
  cubeTexturedIndexCount = inds.length;
}

// 3) Quad Buffers (for ground)
var quadVB = null, quadIB = null, quadIndexCount = 0;
function initQuadBuffers(gl) {
  const verts = new Float32Array([
    -100,0,-100,
     100,0,-100,
     100,0, 100,
    -100,0, 100
  ]);
  const inds = new Uint16Array([0,1,2, 0,2,3]);
  quadVB = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadVB);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  quadIB = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIB);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, inds, gl.STATIC_DRAW);
  quadIndexCount = inds.length;
}

// 4) Skybox Buffers
var skyVBuf=null, skyIBuf=null, skyIndexCount=0;
function initSkyboxBuffers(gl) {
  const verts = new Float32Array([
    -1,-1,1,  1,-1,1,  1,1,1,  -1,1,1,
    -1,-1,-1, 1,-1,-1, 1,1,-1, -1,1,-1
  ]);
  const inds = new Uint16Array([
    0,1,2, 0,2,3,
    4,5,6, 4,6,7,
    0,3,7, 0,7,4,
    1,5,6, 1,6,2,
    3,2,6, 3,6,7,
    0,1,5, 0,5,4
  ]);
  skyVBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, skyVBuf);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  skyIBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyIBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, inds, gl.STATIC_DRAW);
  skyIndexCount = inds.length;
}

/* ---------------------------
   Drawing Functions
   --------------------------- */

function drawColoredCube(gl, program, modelMatrix, color) {
  gl.useProgram(program);

  // Initialize colored cube buffers if not done yet
  if(!cubeColoredVB || !cubeColoredIB) {
    initCubeColoredBuffers(gl);
  }

  // Bind and set up the vertex attribute
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeColoredVB);
  const aPos = gl.getAttribLocation(program, "a_Position");
  // We only stored x,y,z => 3 floats => stride = 3*4
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 3*4, 0);
  gl.enableVertexAttribArray(aPos);

  // Set a constant color
  const aCol = gl.getAttribLocation(program, "a_Color");
  gl.disableVertexAttribArray(aCol);
  gl.vertexAttrib4f(aCol, color[0], color[1], color[2], color[3]);

  // Bind the index buffer
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeColoredIB);

  // Set the model matrix
  const u_Model = gl.getUniformLocation(program, "u_Model");
  gl.uniformMatrix4fv(u_Model, false, modelMatrix);

  // Draw
  gl.disable(gl.CULL_FACE);
  gl.drawElements(gl.TRIANGLES, cubeColoredIndexCount, gl.UNSIGNED_SHORT, 0);
  gl.enable(gl.CULL_FACE);
}

function drawTexturedCube(gl, program, modelMatrix, texture) {
  gl.useProgram(program);

  // Initialize textured cube buffers if not done yet
  if(!cubeTexturedVB || !cubeTexturedIB) {
    initCubeTexturedBuffers(gl);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTexturedVB);

  const aPos = gl.getAttribLocation(program, "a_Position");
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 5*4, 0);
  gl.enableVertexAttribArray(aPos);

  const aTex = gl.getAttribLocation(program, "a_TexCoord");
  gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 5*4, 3*4);
  gl.enableVertexAttribArray(aTex);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTexturedIB);

  const u_Model = gl.getUniformLocation(program, "u_Model");
  gl.uniformMatrix4fv(u_Model, false, modelMatrix);

  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.disable(gl.CULL_FACE);
  gl.drawElements(gl.TRIANGLES, cubeTexturedIndexCount, gl.UNSIGNED_SHORT, 0);
  gl.enable(gl.CULL_FACE);
}

function drawColoredQuad(gl, program, modelMatrix, color) {
  gl.useProgram(program);

  // Initialize quad buffers if not done
  if(!quadVB || !quadIB) {
    initQuadBuffers(gl);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, quadVB);
  const aPos = gl.getAttribLocation(program, "a_Position");
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPos);

  const aCol = gl.getAttribLocation(program, "a_Color");
  gl.disableVertexAttribArray(aCol);
  gl.vertexAttrib4f(aCol, color[0], color[1], color[2], color[3]);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIB);

  const u_Model = gl.getUniformLocation(program, "u_Model");
  gl.uniformMatrix4fv(u_Model, false, modelMatrix);

  gl.disable(gl.CULL_FACE);
  gl.drawElements(gl.TRIANGLES, quadIndexCount, gl.UNSIGNED_SHORT, 0);
  gl.enable(gl.CULL_FACE);
}

function drawTexturedSkybox(gl, program, scale, texture) {
  gl.useProgram(program);

  // Initialize skybox buffers if not done
  if(!skyVBuf || !skyIBuf) {
    initSkyboxBuffers(gl);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, skyVBuf);
  const aPos = gl.getAttribLocation(program, "a_Position");
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPos);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyIBuf);

  const u_Model = gl.getUniformLocation(program, "u_Model");
  let m = mat4.create();
  mat4.scale(m, m, [scale, scale, scale]);
  gl.uniformMatrix4fv(u_Model, false, m);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
  const u_Skybox = gl.getUniformLocation(program, "u_Skybox");
  gl.uniform1i(u_Skybox, 0);

  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.drawElements(gl.TRIANGLES, skyIndexCount, gl.UNSIGNED_SHORT, 0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
}
