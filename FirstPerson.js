// FirstPerson.js

var gl, program, canvas;
var cameraPosition = [0, 1.5, 5]; // Initial camera position above ground
var cameraRotation = 0; // Yaw rotation in degrees
var targetRotation = 0; // Smooth target rotation
var cameraPitch = 0; // Pitch rotation
var targetPitch = 0;
var cameraVelocity = [0, 0, 0]; // Movement velocity
var isMoving = { w: false, a: false, s: false, d: false, space: false };
var isDragging = false;
var lastMouseX = 0;
var lastMouseY = 0;
var mouseSensitivity = 0.2;
var moveSpeed = 0.05;
var turnSpeed = 2;
var rotationLerpFactor = 0.1; // Adjust this for smoother rotation
var movementLerpFactor = 0.1;

const vertexShaderSource = `
    attribute vec4 a_Position;
    attribute vec4 a_Color;
    uniform mat4 u_ViewProjection;
    varying vec4 v_Color;
    void main() {
        gl_Position = u_ViewProjection * a_Position;
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
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program link error: " + gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}

function updateCamera() {
    cameraRotation += (targetRotation - cameraRotation) * rotationLerpFactor;
    cameraPitch += (targetPitch - cameraPitch) * rotationLerpFactor;
    
    let yawRad = cameraRotation * Math.PI / 180;
    let pitchRad = cameraPitch * Math.PI / 180;
    
    let moveX = 0;
    let moveZ = 0;
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
    if (isMoving.space) {
        cameraPosition[1] += moveSpeed;
    }
    
    cameraPosition[0] += moveX * movementLerpFactor;
    cameraPosition[2] += moveZ * movementLerpFactor;
    
    let lookAt = [
        cameraPosition[0] + Math.sin(yawRad) * Math.cos(pitchRad),
        cameraPosition[1] + Math.sin(pitchRad),
        cameraPosition[2] - Math.cos(yawRad) * Math.cos(pitchRad)
    ];
    let viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, cameraPosition, lookAt, [0, 1, 0]);
    let projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100);
    let vpMatrix = mat4.create();
    mat4.multiply(vpMatrix, projectionMatrix, viewMatrix);
    
    let u_ViewProjection = gl.getUniformLocation(program, "u_ViewProjection");
    gl.uniformMatrix4fv(u_ViewProjection, false, vpMatrix);
}

document.addEventListener("keydown", function(event) {
    if (event.key in isMoving) {
        isMoving[event.key] = true;
    }
});

document.addEventListener("keyup", function(event) {
    if (event.key in isMoving) {
        isMoving[event.key] = false;
    }
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
        targetPitch = Math.max(-90, Math.min(90, targetPitch)); // Limit pitch
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
    gl.clearColor(0.1, 0.5, 0.1, 1.0); // Change background to grass green
    drawCube(gl, program, [10, 0.1, 10]); // Increase cube size significantly
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
    
    program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    if (!program) {
        console.error("Failed to create shader program.");
        return;
    }
    gl.useProgram(program);
    renderScene();
}

window.onload = main;