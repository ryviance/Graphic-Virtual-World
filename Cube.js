// Cube.js

function drawCube(gl, prog, m) {
  gl.disable(gl.CULL_FACE);
  m = m || mat4.create();
  const vData = new Float32Array([
    // Front face (with RGBA colors)
    -0.5,-0.5, 0.5,  1,0,0,1,
     0.5,-0.5, 0.5,  0,1,0,1,
     0.5, 0.5, 0.5,  0,0,1,1,
    -0.5, 0.5, 0.5,  1,1,0,1,
    // Back face
    -0.5,-0.5,-0.5,  1,0,1,1,
     0.5,-0.5,-0.5,  0,1,1,1,
     0.5, 0.5,-0.5,  1,1,1,1,
    -0.5, 0.5,-0.5,  0,0,0,1
  ]);
  const inds = new Uint16Array([
    0,1,2, 0,2,3,  4,5,6, 4,6,7,
    0,3,7, 0,7,4,  1,5,6, 1,6,2,
    3,2,6, 3,6,7,  0,1,5, 0,5,4
  ]);
  const vbuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
  gl.bufferData(gl.ARRAY_BUFFER, vData, gl.STATIC_DRAW);
  const FSIZE = vData.BYTES_PER_ELEMENT;
  let aPos = gl.getAttribLocation(prog, "a_Position");
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, FSIZE*7, 0);
  gl.enableVertexAttribArray(aPos);
  let aCol = gl.getAttribLocation(prog, "a_Color");
  gl.vertexAttribPointer(aCol, 4, gl.FLOAT, false, FSIZE*7, FSIZE*3);
  gl.enableVertexAttribArray(aCol);
  const ibuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, inds, gl.STATIC_DRAW);
  gl.uniformMatrix4fv(gl.getUniformLocation(prog, "u_Model"), false, m);
  gl.drawElements(gl.TRIANGLES, inds.length, gl.UNSIGNED_SHORT, 0);
  gl.enable(gl.CULL_FACE);
}

function drawGrassBlock(gl, prog) {
  const verts = new Float32Array([
    -100,0,-100,  100,0,-100,  100,0,100,  -100,0,100,
    -100,-1,-100, 100,-1,-100, 100,-1,100, -100,-1,100,
    -100,0,100,  100,0,100,  100,-1,100, -100,-1,100,
    100,0,-100, -100,0,-100, -100,-1,-100, 100,-1,-100,
    -100,0,-100, -100,0,100,  -100,-1,100, -100,-1,-100,
    100,0,100,  100,0,-100,  100,-1,-100, 100,-1,100
  ]);
  const inds = new Uint16Array([
    0,1,2, 0,2,3,  4,5,6, 4,6,7,
    8,9,10, 8,10,11,  12,13,14, 12,14,15,
    16,17,18, 16,18,19,  20,21,22, 20,22,23
  ]);
  gl.disable(gl.CULL_FACE);
  let vbuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  const FSIZE = verts.BYTES_PERElement;
  let aPos = gl.getAttribLocation(prog, "a_Position");
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, FSIZE*3, 0);
  gl.enableVertexAttribArray(aPos);
  let aCol = gl.getAttribLocation(prog, "a_Color");
  gl.disableVertexAttribArray(aCol);
  gl.vertexAttrib4f(aCol, 0.0,0.8,0.0,1.0);
  let ibuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, inds, gl.STATIC_DRAW);
  gl.uniformMatrix4fv(gl.getUniformLocation(prog, "u_Model"), false, mat4.create());
  gl.drawElements(gl.TRIANGLES, inds.length, gl.UNSIGNED_SHORT, 0);
  gl.enable(gl.CULL_FACE);
}