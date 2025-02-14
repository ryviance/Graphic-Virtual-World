// FirstPerson.js

var gl, program, canvas;
var skyboxProgram;
var skyboxTexture;
var cameraPosition = [0, 1.5, 5]; // Initial camera position above ground
var cameraRotation = 0;         // Yaw rotation in degrees
var targetRotation = 0;         // Smooth target rotation
// Set the camera to look slightly downward so the ground is visible
var cameraPitch = -30;          // Pitch rotation in degrees
var targetPitch = -30;
var cameraVelocity = [0, 0, 0];   // Movement velocity
var isMoving = { w: false, a: false, s: false, d: false, space: false, shift: false, q: false, e: false };
var isDragging = false;
var lastMouseX = 0;
var lastMouseY = 0;
var mouseSensitivity = 0.2;
var moveSpeed = 1;
var turnSpeed = 1.5;
var rotationLerpFactor = 0.1;   // Adjust for smoother rotation
var movementLerpFactor = 0.1;

// Array to store random block positions (each is [x, z])
var blockPositions = [];

/* ---------- Normal Object Shader (for grass and cubes) ---------- */
const vertexShaderSource = `
    attribute vec4 a_Position;
    attribute vec4 a_Color;
    uniform mat4 u_ViewProjection;
    uniform mat4 u_Model;
    varying vec4 v_Color;
    void main() {
        gl_Position = u_ViewProjection * u_Model * a_Position;
        v_Color = a_Color;
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    varying vec4 v_Color;
    void main() {
        gl_FragColor = v_Color;
    }
`;

/* ---------- Skybox Shader (Textured Cube Map) ---------- */
const skyboxVertexShaderSource = `
    attribute vec3 a_Position;
    varying vec3 v_TexCoord;
    uniform mat4 u_ViewProjection;
    void main() {
      // Pass the vertex position as texture coordinate
      v_TexCoord = a_Position;
      // Remove translation by setting w components equal to z (ensuring depth is 1.0)
      vec4 pos = u_ViewProjection * vec4(a_Position, 1.0);
      gl_Position = pos.xyww;
    }
`;

const skyboxFragmentShaderSource = `
    precision mediump float;
    varying vec3 v_TexCoord;
    uniform samplerCube u_Skybox;
    void main() {
      gl_FragColor = textureCube(u_Skybox, v_TexCoord);
    }
`;

/* ---------- Utility Functions ---------- */
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error: " + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vShaderSource, fShaderSource) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fShaderSource);
    const prog = gl.createProgram();
    gl.attachShader(prog, vertexShader);
    gl.attachShader(prog, fragmentShader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("Program link error: " + gl.getProgramInfoLog(prog));
        return null;
    }
    return prog;
}

/* ---------- Cube Map Texture Loader (Using a single PNG for all faces) ---------- */
function loadCubeMapTexture(gl, url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

  const faceInfos = [
    { target: gl.TEXTURE_CUBE_MAP_POSITIVE_X },
    { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X },
    { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y },
    { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y },
    { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z },
    { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z },
  ];

  // Fill each face with a temporary 1x1 blue pixel.
  faceInfos.forEach(function(faceInfo) {
    gl.texImage2D(faceInfo.target, 0, gl.RGBA, 1, 1, 0,
                  gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));
  });

  // Load the image.
  const image = new Image();
  image.src = url;
  image.onload = function() {
    faceInfos.forEach(function(faceInfo) {
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
      // Use the same image for all faces.
      gl.texImage2D(faceInfo.target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    });
    // If your image dimensions are NPOT, do not generate mipmaps.
    // Here, we assume the image is NPOT, so we set filtering accordingly:
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // If your image is power-of-two, you could use mipmapping:
    // gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  };

  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return texture;
}

/* ---------- Skybox Draw Function (Textured) ---------- */
function drawTexturedSkybox(gl, program, scale, skyboxTexture) {
  // Define the vertices for a cube (positions only)
  const vertices = new Float32Array([
    -1, -1,  1,
     1, -1,  1,
     1,  1,  1,
    -1,  1,  1,
    -1, -1, -1,
     1, -1, -1,
     1,  1, -1,
    -1,  1, -1,
  ]);
  const indices = new Uint16Array([
    0, 1, 2, 0, 2, 3,       // front
    4, 5, 6, 4, 6, 7,       // back
    0, 3, 7, 0, 7, 4,       // left
    1, 5, 6, 1, 6, 2,       // right
    3, 2, 6, 3, 6, 7,       // top
    0, 1, 5, 0, 5, 4        // bottom
  ]);

  // Create and bind vertex buffer.
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  const FSIZE = vertices.BYTES_PER_ELEMENT;
  
  const a_Position = gl.getAttribLocation(program, "a_Position");
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 3, 0);
  gl.enableVertexAttribArray(a_Position);
  
  // Create and bind index buffer.
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  
  // Set model matrix: center on the camera and scale up.
  let u_Model = gl.getUniformLocation(program, "u_Model");
  let modelMatrix = mat4.create();
  // Translate to the camera's position so the skybox always surrounds you.
  mat4.translate(modelMatrix, modelMatrix, cameraPosition);
  mat4.scale(modelMatrix, modelMatrix, [scale, scale, scale]);
  gl.uniformMatrix4fv(u_Model, false, modelMatrix);
  
  // Bind the cube map texture.
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
  let u_Skybox = gl.getUniformLocation(program, "u_Skybox");
  gl.uniform1i(u_Skybox, 0);
  
  // Render the skybox.
  gl.depthMask(false);        // Prevent writing to depth buffer
  gl.disable(gl.CULL_FACE);     // Render all faces
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
  gl.depthMask(true);
  gl.enable(gl.CULL_FACE);
}

/* ---------- Standard Scene Functions ---------- */
function updateCamera() {
    cameraRotation += (targetRotation - cameraRotation) * rotationLerpFactor;
    cameraPitch += (targetPitch - cameraPitch) * rotationLerpFactor;
    
    let yawRad = cameraRotation * Math.PI / 180;
    let pitchRad = cameraPitch * Math.PI / 180;
    
    let moveX = 0, moveZ = 0, moveY = 0;
    if (isMoving.q) targetRotation -= turnSpeed;
    if (isMoving.e) targetRotation += turnSpeed;
    if (isMoving.w) {
        moveX += moveSpeed * Math.sin(yawRad);
        moveZ -= moveSpeed * Math.cos(yawRad);
    }
    if (isMoving.s) {
        moveX -= moveSpeed * Math.sin(yawRad);
        moveZ += moveSpeed * Math.cos(yawRad);
    }
    if (isMoving.a) {
        moveX -= moveSpeed * Math.cos(yawRad);
        moveZ -= moveSpeed * Math.sin(yawRad);
    }
    if (isMoving.d) {
        moveX += moveSpeed * Math.cos(yawRad);
        moveZ += moveSpeed * Math.sin(yawRad);
    }
    if (isMoving.space) moveY += moveSpeed;
    if (isMoving.shift) moveY -= moveSpeed;
    
    cameraPosition[0] += moveX * movementLerpFactor;
    cameraPosition[1] += moveY * movementLerpFactor;
    cameraPosition[2] += moveZ * movementLerpFactor;
    
    let lookAt = [
        cameraPosition[0] + Math.sin(yawRad) * Math.cos(pitchRad),
        cameraPosition[1] + Math.sin(pitchRad),
        cameraPosition[2] - Math.cos(yawRad) * Math.cos(pitchRad)
    ];
    let viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, cameraPosition, lookAt, [0, 1, 0]);
    let projectionMatrix = mat4.create();
    // Increase FOV for a more pronounced perspective and set far plane to 1000.
    mat4.perspective(projectionMatrix, Math.PI/3, canvas.width / canvas.height, 0.1, 1000);
    let vpMatrix = mat4.create();
    mat4.multiply(vpMatrix, projectionMatrix, viewMatrix);
    
    let u_ViewProjection = gl.getUniformLocation(program, "u_ViewProjection");
    gl.uniformMatrix4fv(u_ViewProjection, false, vpMatrix);
}

document.addEventListener("keydown", function(event) {
    let key = event.key.toLowerCase();
    if (key === " ") key = "space";
    if (key in isMoving) isMoving[key] = true;
});
document.addEventListener("keyup", function(event) {
    let key = event.key.toLowerCase();
    if (key === " ") key = "space";
    if (key in isMoving) isMoving[key] = false;
});
document.addEventListener("mousedown", function(event) {
    isDragging = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
});
document.addEventListener("mousemove", function(event) {
    if (isDragging) {
        let dx = event.clientX - lastMouseX;
        let dy = event.clientY - lastMouseY;
        targetRotation += dx * mouseSensitivity;
        targetPitch -= dy * mouseSensitivity;
        targetPitch = Math.max(-90, Math.min(90, targetPitch));
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }
});
document.addEventListener("mouseup", function() {
    isDragging = false;
});

function renderScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    updateCamera();
    
    // --- Draw the Textured Skybox ---
    gl.useProgram(skyboxProgram);
    drawTexturedSkybox(gl, skyboxProgram, 50, skyboxTexture);
    
    // --- Draw the rest of the scene using the normal shader ---
    gl.useProgram(program);
    drawGrassBlock(gl, program);
    
    // Draw 15 random cubes on the ground.
    for (var i = 0; i < blockPositions.length; i++) {
        let model = mat4.create();
        let pos = blockPositions[i]; // pos is [x, z]
        // Translate upward by 0.5 so that the cube sits on the ground.
        mat4.translate(model, model, [pos[0], 0.5, pos[1]]);
        drawCube(gl, program, model);
    }
    
    requestAnimationFrame(renderScene);
}

function main() {
    canvas = document.getElementById("webgl");
    if (!canvas) {
        console.error("Failed to find canvas element.");
        return;
    }
    gl = canvas.getContext("webgl");
    if (!gl) {
        console.error("Failed to get WebGL context.");
        return;
    }
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 1);
    
    // Create the normal shader program.
    program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    if (!program) {
        console.error("Failed to create normal shader program.");
        return;
    }
    
    // Create the skybox shader program.
    skyboxProgram = createProgram(gl, skyboxVertexShaderSource, skyboxFragmentShaderSource);
    if (!skyboxProgram) {
        console.error("Failed to create skybox shader program.");
        return;
    }
    
    gl.useProgram(program);
    
    // Generate 15 random block positions on the ground (x and z between -50 and 50).
    for (var i = 0; i < 15; i++) {
        var x = Math.random() * 100 - 50;
        var z = Math.random() * 100 - 50;
        blockPositions.push([x, z]);
    }
    
    // Load the cube map texture using a single PNG for all faces.
    skyboxTexture = loadCubeMapTexture(gl, "skytexture.png");
    
    renderScene();
}

window.onload = main;