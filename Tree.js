// Tree.js

function createFancyCherryTree1(base) {
    var trunk = [];
    var leaves = [];
    var bx = base[0], bz = base[1];
    trunk.push([bx,0.5,bz]);
    trunk.push([bx,1.5,bz]);
    trunk.push([bx,2.5,bz]);
    trunk.push([bx,3.5,bz]);
    trunk.push([bx,4.5,bz]);
    trunk.push([bx,5.5,bz]);
    trunk.push([bx+1,4.5,bz]);
    trunk.push([bx+2,4.5,bz]);
    trunk.push([bx+2,5.5,bz]);
    for(var x=-1;x<=1;x++){
      for(var y=0;y<=1;y++){
        for(var z=-1;z<=1;z++){
          leaves.push([bx+x,5.5+y,bz+z]);
        }
      }
    }
    for(var x=-1;x<=1;x++){
      for(var y=-1;y<=1;y++){
        for(var z=-1;z<=1;z++){
          leaves.push([bx+2+x,5.5+y,bz+z]);
        }
      }
    }
    return { trunk: trunk, leaves: leaves };
  }
  
  function createFancyCherryTree2(base) {
    var trunk = [];
    var leaves = [];
    var bx = base[0], bz = base[1];
    trunk.push([bx,0.5,bz]);
    trunk.push([bx,1.5,bz]);
    trunk.push([bx,2.5,bz]);
    trunk.push([bx+1,2.5,bz]);
    trunk.push([bx-1,2.5,bz]);
    trunk.push([bx,2.5,bz+1]);
    trunk.push([bx,2.5,bz-1]);
    for(var x=-2;x<=2;x++){
      for(var z=-2;z<=2;z++){
        for(var y=3.5;y>=1.5;y-=1){
          leaves.push([bx+x,y,bz+z]);
        }
      }
    }
    return { trunk: trunk, leaves: leaves };
  }
  
  function createFancyCherryTree3(base) {
    var trunk = [];
    var leaves = [];
    var bx = base[0], bz = base[1];
    for(var i=0;i<5;i++){
      trunk.push([bx,i+0.5,bz]);
    }
    trunk.push([bx+1,5.5,bz]);
    trunk.push([bx-1,5.5,bz]);
    trunk.push([bx,5.5,bz+1]);
    for(var x=-2;x<=2;x++){
      for(var y=4;y<=6;y++){
        for(var z=-2;z<=2;z++){
          leaves.push([bx+x,y+0.5,bz+z]);
        }
      }
    }
    leaves.push([bx+1,6.5,bz]);
    leaves.push([bx-1,6.5,bz]);
    leaves.push([bx,6.5,bz+1]);
    return { trunk: trunk, leaves: leaves };
  }
  
  function drawCherryTree(gl, tree) {
    gl.useProgram(trunkProgram);
    for(var i=0;i<tree.trunk.length;i++){
      var m = mat4.create();
      mat4.translate(m, m, tree.trunk[i]);
      drawTexturedCube(gl, trunkProgram, m, logTexture);
    }
    for(var i=0;i<tree.leaves.length;i++){
      var m = mat4.create();
      mat4.translate(m, m, tree.leaves[i]);
      drawTexturedCube(gl, trunkProgram, m, leafTexture);
    }
  }
  