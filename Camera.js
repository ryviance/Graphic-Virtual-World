// Camera.js
var camPos = [0,1.5,5], camRot = 0, tarRot = 0, camPitch = -30, tarPitch = -30;
var isMoving = {w:false,a:false,s:false,d:false,space:false,shift:false,q:false,e:false}, isDragging = false;
var lastX = 0, lastY = 0, mSens = 0.2, mSpeed = 1, tSpeed = 1.5;
var rotLerp = 0.1, movLerp = 0.1;
function updateCamera(gl, prog, canvas) {
  // Ensure the correct program is active
  gl.useProgram(prog);

  camRot += (tarRot - camRot) * rotLerp;
  camPitch += (tarPitch - camPitch) * rotLerp;
  let yaw = camRot * Math.PI/180, pitch = camPitch * Math.PI/180;
  let dx = 0, dz = 0, dy = 0;
  if(isMoving.q) tarRot -= tSpeed;
  if(isMoving.e) tarRot += tSpeed;
  if(isMoving.w){ dx += mSpeed*Math.sin(yaw); dz -= mSpeed*Math.cos(yaw); }
  if(isMoving.s){ dx -= mSpeed*Math.sin(yaw); dz += mSpeed*Math.cos(yaw); }
  if(isMoving.a){ dx -= mSpeed*Math.cos(yaw); dz -= mSpeed*Math.sin(yaw); }
  if(isMoving.d){ dx += mSpeed*Math.cos(yaw); dz += mSpeed*Math.sin(yaw); }
  if(isMoving.space) dy += mSpeed;
  if(isMoving.shift) dy -= mSpeed;
  camPos[0] += dx * movLerp; 
  camPos[1] += dy * movLerp; 
  camPos[2] += dz * movLerp;
  let lookAt = [
    camPos[0] + Math.sin(yaw)*Math.cos(pitch),
    camPos[1] + Math.sin(pitch),
    camPos[2] - Math.cos(yaw)*Math.cos(pitch)
  ];
  let view = mat4.create();
  mat4.lookAt(view, camPos, lookAt, [0,1,0]);
  let proj = mat4.create();
  mat4.perspective(proj, Math.PI/3, canvas.width/canvas.height, 0.1, 1000);
  let vp = mat4.create();
  mat4.multiply(vp, proj, view);
  gl.uniformMatrix4fv(gl.getUniformLocation(prog, "u_ViewProjection"), false, vp);
  return {proj: proj, view: view};
}
["keydown","keyup"].forEach(e => {
  document.addEventListener(e, ev => {
    let k = ev.key.toLowerCase(); if(k===" ") k="space";
    isMoving[k] = (e==="keydown");
  });
});
["mousedown","mousemove","mouseup"].forEach(e => {
  document.addEventListener(e, ev => {
    if(e==="mousedown"){ isDragging = true; lastX = ev.clientX; lastY = ev.clientY; }
    else if(e==="mousemove" && isDragging){
      let dx = ev.clientX - lastX, dy = ev.clientY - lastY;
      tarRot += dx * mSens; tarPitch -= dy * mSens;
      tarPitch = Math.max(-90, Math.min(90, tarPitch));
      lastX = ev.clientX; lastY = ev.clientY;
    } else if(e==="mouseup") isDragging = false;
  });
});