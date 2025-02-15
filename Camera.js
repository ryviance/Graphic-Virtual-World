// Camera.js

var camPos = [0, 1.5, 5],
    camRot = 0, tarRot = 0,
    camPitch = -30, tarPitch = -30;
var isMoving = {w:false, a:false, s:false, d:false, space:false, shift:false, q:false, e:false};
var mSens = 0.2, mSpeed = 1, tSpeed = 1.5;
var rotLerp = 0.1, movLerp = 0.1;

var canvas = document.getElementById("webgl");

// Request pointer lock on click.
canvas.addEventListener("click", function() {
  canvas.requestPointerLock = canvas.requestPointerLock ||
                              canvas.mozRequestPointerLock ||
                              canvas.webkitRequestPointerLock;
  if (canvas.requestPointerLock) {
    canvas.requestPointerLock();
  }
});

// Listen for pointer lock changes.
document.addEventListener("pointerlockchange", lockChangeAlert, false);
document.addEventListener("mozpointerlockchange", lockChangeAlert, false);
document.addEventListener("webkitpointerlockchange", lockChangeAlert, false);

function lockChangeAlert() {
  let plElement = document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement;
  if (plElement === canvas) {
    console.log("Pointer lock enabled");
    document.addEventListener("mousemove", updateRotation, false);
  } else {
    console.log("Pointer lock disabled");
    document.removeEventListener("mousemove", updateRotation, false);
  }
}

function updateRotation(e) {
  // Use movementX and movementY from the pointer lock event
  let dx = e.movementX || 0;
  let dy = e.movementY || 0;
  tarRot += dx * mSens;
  tarPitch -= dy * mSens;
  tarPitch = Math.max(-90, Math.min(90, tarPitch));
}

function updateCamera(gl, prog, canvas) {
  gl.useProgram(prog);
  
  // Smooth rotation and pitch update
  camRot += (tarRot - camRot) * rotLerp;
  camPitch += (tarPitch - camPitch) * rotLerp;
  
  let yaw = camRot * Math.PI / 180,
      pitch = camPitch * Math.PI / 180;
  
  // Process keyboard movement
  let dx = 0, dz = 0, dy = 0;
  if(isMoving.q) tarRot -= tSpeed;
  if(isMoving.e) tarRot += tSpeed;
  if(isMoving.w){ dx += mSpeed * Math.sin(yaw); dz -= mSpeed * Math.cos(yaw); }
  if(isMoving.s){ dx -= mSpeed * Math.sin(yaw); dz += mSpeed * Math.cos(yaw); }
  if(isMoving.a){ dx -= mSpeed * Math.cos(yaw); dz -= mSpeed * Math.sin(yaw); }
  if(isMoving.d){ dx += mSpeed * Math.cos(yaw); dz += mSpeed * Math.sin(yaw); }
  if(isMoving.space) dy += mSpeed;
  if(isMoving.shift) dy -= mSpeed;
  
  camPos[0] += dx * movLerp;
  camPos[1] += dy * movLerp;
  camPos[2] += dz * movLerp;
  
  // Calculate lookAt point
  let lookAt = [
    camPos[0] + Math.sin(yaw) * Math.cos(pitch),
    camPos[1] + Math.sin(pitch),
    camPos[2] - Math.cos(yaw) * Math.cos(pitch)
  ];
  
  let view = mat4.create();
  mat4.lookAt(view, camPos, lookAt, [0, 1, 0]);
  let proj = mat4.create();
  mat4.perspective(proj, Math.PI/3, canvas.width / canvas.height, 0.1, 1000);
  
  let vp = mat4.create();
  mat4.multiply(vp, proj, view);
  gl.uniformMatrix4fv(gl.getUniformLocation(prog, "u_ViewProjection"), false, vp);
  
  return { proj: proj, view: view };
}

// Key event listeners remain as before.
["keydown", "keyup"].forEach(e => {
  document.addEventListener(e, event => {
    let key = event.key.toLowerCase();
    if(key === " ") key = "space";
    isMoving[key] = (e === "keydown");
  });
});