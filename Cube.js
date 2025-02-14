/**
 * drawCube builds the necessary buffers for a cube (composed of triangles)
 * and draws it with vertex colors.
 * 
 * Now it accepts an optional modelMatrix parameter. If none is provided,
 * the identity matrix is used.
 *
 * Face culling is disabled in this function so that all faces are visible.
 *
 * @param {WebGLRenderingContext} gl - The WebGL context.
 * @param {WebGLProgram} program - The shader program.
 * @param {mat4} [modelMatrix] - Optional transformation matrix.
 */
function drawCube(gl, program, modelMatrix) {
  // Disable face culling so that both sides are rendered.
  gl.disable(gl.CULL_FACE);
  
  if (!modelMatrix) {
      modelMatrix = mat4.create();
  }
  
  // Cube vertex data: 3 position components and 4 color components per vertex.
  const verticesColors = new Float32Array([
    // Front face
    -0.5, -0.5,  0.5,   1, 0, 0, 1,  // Red
     0.5, -0.5,  0.5,   0, 1, 0, 1,  // Green
     0.5,  0.5,  0.5,   0, 0, 1, 1,  // Blue
    -0.5,  0.5,  0.5,   1, 1, 0, 1,  // Yellow

    // Back face
    -0.5, -0.5, -0.5,   1, 0, 1, 1,  // Purple
     0.5, -0.5, -0.5,   0, 1, 1, 1,  // Cyan
     0.5,  0.5, -0.5,   1, 1, 1, 1,  // White
    -0.5,  0.5, -0.5,   0, 0, 0, 1   // Black
  ]);

  // Indices for 12 triangles (2 per cube face)
  const indices = new Uint16Array([
    // Front face
    0, 1, 2,   0, 2, 3,
    // Back face
    4, 5, 6,   4, 6, 7,
    // Left face
    0, 3, 7,   0, 7, 4,
    // Right face
    1, 5, 6,   1, 6, 2,
    // Top face
    3, 2, 6,   3, 6, 7,
    // Bottom face
    0, 1, 5,   0, 5, 4
  ]);

  // Create and bind the vertex buffer.
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesColors, gl.STATIC_DRAW);
  const FSIZE = verticesColors.BYTES_PER_ELEMENT;

  // Get attribute locations.
  const a_Position = gl.getAttribLocation(program, "a_Position");
  const a_Color = gl.getAttribLocation(program, "a_Color");

  // Set up the position attribute (3 floats per vertex).
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 7, 0);
  gl.enableVertexAttribArray(a_Position);

  // Set up the color attribute (4 floats per vertex, starting after 3 floats).
  gl.vertexAttribPointer(a_Color, 4, gl.FLOAT, false, FSIZE * 7, FSIZE * 3);
  gl.enableVertexAttribArray(a_Color);

  // Create and bind the index buffer.
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  // Set the model matrix.
  let u_Model = gl.getUniformLocation(program, "u_Model");
  gl.uniformMatrix4fv(u_Model, false, modelMatrix);

  // Draw the cube.
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
  
  // Re-enable face culling for subsequent objects.
  gl.enable(gl.CULL_FACE);
}

/**
 * drawSkyboxCube creates a large cube that acts as a skybox.
 * It uses only positions, sets the color to light blue, and is centered on the camera.
 *
 * In this updated version, we disable face culling so that all faces are rendered,
 * ensuring no sides are missing.
 *
 * @param {WebGLRenderingContext} gl - The WebGL context.
 * @param {WebGLProgram} program - The shader program.
 * @param {number} scale - The scaling factor for the skybox cube.
 */
function drawSkyboxCube(gl, program, scale) {
  const vertices = new Float32Array([
    -0.5, -0.5,  0.5,
     0.5, -0.5,  0.5,
     0.5,  0.5,  0.5,
    -0.5,  0.5,  0.5,
    -0.5, -0.5, -0.5,
     0.5, -0.5, -0.5,
     0.5,  0.5, -0.5,
    -0.5,  0.5, -0.5
  ]);

  const indices = new Uint16Array([
    0, 1, 2,   0, 2, 3,
    4, 5, 6,   4, 6, 7,
    0, 3, 7,   0, 7, 4,
    1, 5, 6,   1, 6, 2,
    3, 2, 6,   3, 6, 7,
    0, 1, 5,   0, 5, 4
  ]);

  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  const FSIZE = vertices.BYTES_PER_ELEMENT;
  
  const a_Position = gl.getAttribLocation(program, "a_Position");
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 3, 0);
  gl.enableVertexAttribArray(a_Position);

  const a_Color = gl.getAttribLocation(program, "a_Color");
  gl.disableVertexAttribArray(a_Color);
  // Light blue color for the skybox: 0.53, 0.81, 0.98, 1.0
  gl.vertexAttrib4f(a_Color, 0.53, 0.81, 0.98, 1.0);

  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  const u_Model = gl.getUniformLocation(program, "u_Model");
  let modelMatrix = mat4.create();
  mat4.translate(modelMatrix, modelMatrix, cameraPosition);
  mat4.scale(modelMatrix, modelMatrix, [scale, scale, scale]);
  gl.uniformMatrix4fv(u_Model, false, modelMatrix);

  // Disable face culling for the skybox so all sides are rendered.
  gl.disable(gl.CULL_FACE);
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
  // Optionally re-enable face culling afterward.
  gl.enable(gl.CULL_FACE);
}

/**
 * drawGrassBlock creates a thick ground block covering a 200×200 area.
 * The top is at y = 0 and the bottom is at y = -1, giving 1 unit thickness.
 * Face culling is disabled so that the block is visible from all sides.
 *
 * @param {WebGLRenderingContext} gl - The WebGL context.
 * @param {WebGLProgram} program - The shader program.
 */
function drawGrassBlock(gl, program) {
  const vertices = new Float32Array([
    // Top face (y = 0)
    -100,  0, -100,
     100,  0, -100,
     100,  0,  100,
    -100,  0,  100,
    // Bottom face (y = -1)
    -100, -1, -100,
     100, -1, -100,
     100, -1,  100,
    -100, -1,  100,
    // Front face (z = 100)
    -100,  0,  100,
     100,  0,  100,
     100, -1,  100,
    -100, -1,  100,
    // Back face (z = -100)
     100,  0, -100,
    -100,  0, -100,
    -100, -1, -100,
     100, -1, -100,
    // Left face (x = -100)
    -100,  0, -100,
    -100,  0,  100,
    -100, -1,  100,
    -100, -1, -100,
    // Right face (x = 100)
     100,  0,  100,
     100,  0, -100,
     100, -1, -100,
     100, -1,  100,
  ]);
  
  const indices = new Uint16Array([
    // Top face
    0, 1, 2, 0, 2, 3,
    // Bottom face
    4, 5, 6, 4, 6, 7,
    // Front face
    8, 9, 10, 8, 10, 11,
    // Back face
    12, 13, 14, 12, 14, 15,
    // Left face
    16, 17, 18, 16, 18, 19,
    // Right face
    20, 21, 22, 20, 22, 23,
  ]);
  
  gl.disable(gl.CULL_FACE);
  
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  const FSIZE = vertices.BYTES_PER_ELEMENT;
  
  const a_Position = gl.getAttribLocation(program, "a_Position");
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 3, 0);
  gl.enableVertexAttribArray(a_Position);
  
  const a_Color = gl.getAttribLocation(program, "a_Color");
  gl.disableVertexAttribArray(a_Color);
  // Grass green: 0.0, 0.8, 0.0, 1.0
  gl.vertexAttrib4f(a_Color, 0.0, 0.8, 0.0, 1.0);
  
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  
  const u_Model = gl.getUniformLocation(program, "u_Model");
  let modelMatrix = mat4.create();
  gl.uniformMatrix4fv(u_Model, false, modelMatrix);
  
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
  
  gl.enable(gl.CULL_FACE);
}