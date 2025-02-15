// Torii.js

function createTorii(base) {
    const bx = base[0], bz = base[1];
    const blackFeet = [], redPillars = [], crossbeams = [], roof = [];
    // Pillars: bottom 2 blocks (black)
    for (let y = 0; y < 2; y++) {
      blackFeet.push([bx, y + 0.5, bz]);
      blackFeet.push([bx + 4, y + 0.5, bz]);
    }
    // Pillars: remaining 5 blocks (red)
    for (let y = 2; y < 7; y++) {
      redPillars.push([bx, y + 0.5, bz]);
      redPillars.push([bx + 4, y + 0.5, bz]);
    }
    // Crossbeams: lower at y=5.5, x=0..4
    for (let x = 0; x <= 4; x++) {
      crossbeams.push([bx + x, 5.5, bz]);
    }
    // Crossbeams: upper at y=7.0, x=-1..5
    for (let x = -1; x <= 5; x++) {
      crossbeams.push([bx + x, 7.0, bz]);
    }
    // Roof: main layer y=8, x=-1..5
    for (let x = -1; x <= 5; x++) {
      roof.push([bx + x, 8.0, bz + 0.5]);
    }
    // Roof: second layer y=8.5, x=0..4
    for (let x = 0; x <= 4; x++) {
      roof.push([bx + x, 8.5, bz + 0.5]);
    }
    // Roof: end tips at x=-2 and x=6
    roof.push([bx - 2, 8.5, bz + 0.5]);
    roof.push([bx + 6, 8.5, bz + 0.5]);
    
    return { blackFeet, redPillars, crossbeams, roof };
  }
  
  function drawTorii(gl, torii) {
    gl.useProgram(colorProgram);
    const black = [0, 0, 0, 1], red = [1, 0, 0, 1];
    for (let i = 0; i < torii.blackFeet.length; i++) {
      let m = mat4.create();
      mat4.translate(m, m, torii.blackFeet[i]);
      drawColoredCube(gl, colorProgram, m, black);
    }
    for (let i = 0; i < torii.redPillars.length; i++) {
      let m = mat4.create();
      mat4.translate(m, m, torii.redPillars[i]);
      drawColoredCube(gl, colorProgram, m, red);
    }
    for (let i = 0; i < torii.crossbeams.length; i++) {
      let m = mat4.create();
      mat4.translate(m, m, torii.crossbeams[i]);
      drawColoredCube(gl, colorProgram, m, red);
    }
    for (let i = 0; i < torii.roof.length; i++) {
      let m = mat4.create();
      mat4.translate(m, m, torii.roof[i]);
      drawColoredCube(gl, colorProgram, m, black);
    }
  }
  