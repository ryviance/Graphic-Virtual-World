// Tree.js

function addBlock(array, x, y, z, used) {
    let key = x + "," + y + "," + z;
    if (!used.has(key)) {
      array.push([x, y, z]);
      used.add(key);
    }
  }
  
  function createFancyCherryTree1(base) {
    const trunk=[], leaves=[], used=new Set();
    const bx=base[0], bz=base[1];
    for(let i=0;i<8;i++){addBlock(trunk,bx,i,bz,used);}
    addBlock(trunk,bx+1,3,bz,used);addBlock(trunk,bx+2,3,bz,used);addBlock(trunk,bx+2,4,bz,used);
    addBlock(trunk,bx-1,5,bz,used);addBlock(trunk,bx-2,5,bz,used);addBlock(trunk,bx-2,6,bz,used);
    for(let x=-2;x<=2;x++){for(let z=-2;z<=2;z++){addBlock(leaves,bx+x,8,bz+z,used);}}
    for(let x=-1;x<=1;x++){for(let z=-1;z<=1;z++){addBlock(leaves,bx+2+x,4,bz+z,used);}}
    for(let x=-1;x<=1;x++){for(let z=-1;z<=1;z++){addBlock(leaves,bx-2+x,6,bz+z,used);}}
    return{trunk,leaves};
  }
  
  function createFancyCherryTree2(base) {
    const trunk=[], leaves=[], used=new Set();
    const bx=base[0], bz=base[1];
    for(let i=0;i<5;i++){addBlock(trunk,bx,i,bz,used);}
    addBlock(trunk,bx+2,2,bz,used);addBlock(trunk,bx-2,2,bz,used);addBlock(trunk,bx,2,bz+2,used);addBlock(trunk,bx,2,bz-2,used);
    addBlock(trunk,bx+1,3,bz+1,used);addBlock(trunk,bx-1,3,bz-1,used);
    for(let x=-3;x<=3;x++){for(let z=-3;z<=3;z++){for(let y=5;y>=1;y--){addBlock(leaves,bx+x,y,bz+z,used);}}}
    return{trunk,leaves};
  }
  
  function createFancyCherryTree3(base) {
    const trunk=[], leaves=[], used=new Set();
    const bx=base[0], bz=base[1];
    for(let i=0;i<9;i++){addBlock(trunk,bx,i,bz,used);}
    addBlock(trunk,bx+2,8,bz,used);addBlock(trunk,bx-2,8,bz,used);addBlock(trunk,bx,8,bz+2,used);addBlock(trunk,bx,8,bz-2,used);
    for(let x=-3;x<=3;x++){for(let y=9;y<=10;y++){for(let z=-3;z<=3;z++){addBlock(leaves,bx+x,y,bz+z,used);}}}
    addBlock(leaves,bx+2,9,bz,used);addBlock(leaves,bx-2,9,bz,used);addBlock(leaves,bx,9,bz+2,used);addBlock(leaves,bx,9,bz-2,used);
    return{trunk,leaves};
  }
  
  function createFancyCherryTree4(base) {
    const trunk=[], leaves=[], used=new Set();
    const bx=base[0], bz=base[1];
    function A(a,x,y,z){addBlock(a,x,y,z,used);}
    A(trunk,bx,0,bz);A(trunk,bx,1,bz);A(trunk,bx,2,bz);
    A(trunk,bx+1,3,bz);A(trunk,bx+1,4,bz);
    A(trunk,bx+2,5,bz);A(trunk,bx+2,6,bz);
    A(trunk,bx+2,7,bz);
    A(trunk,bx+2,7,bz+1);A(trunk,bx+2,7,bz+2);A(trunk,bx+2,8,bz+2);
    A(trunk,bx+1,5,bz-1);A(trunk,bx+1,5,bz-2);
    for(let x=-3;x<=3;x++){for(let y=0;y<=1;y++){for(let z=-3;z<=3;z++){A(leaves,bx+2+x,8+y,bz+2+z);}}}
    for(let x=-1;x<=1;x++){for(let y=-1;y<=1;y++){for(let z=-1;z<=1;z++){A(leaves,bx+1+x,5+y,bz-2+z);}}}
    for(let x=-2;x<=2;x++){for(let z=-2;z<=2;z++){for(let y=3;y<=4;y++){A(leaves,bx+1+x,y,bz+z);}}}
    return{trunk,leaves};
  }
  
  function createFancyCherryTree5(base) {
    const trunk=[], leaves=[], used=new Set();
    const bx=base[0], bz=base[1];
    function A(a,x,y,z){addBlock(a,x,y,z,used);}
    for(let i=0;i<8;i++){A(trunk,bx,i,bz);}
    for(let i=0;i<7;i++){A(trunk,bx+1,i,bz);}
    A(trunk,bx+2,7,bz);
    for(let x=-3;x<=3;x++){for(let z=-3;z<=3;z++){for(let y=6;y<=7;y++){A(leaves,bx+1+x,y,bz+z);}}}
    for(let x=-2;x<=2;x++){for(let z=-2;z<=2;z++){for(let y=3;y<=4;y++){A(leaves,bx+1+x,y,bz+z);}}}
    return{trunk,leaves};
  }
  
  function createFancyCherryTree6(base) {
    const trunk=[], leaves=[], used=new Set();
    const bx=base[0], bz=base[1];
    function A(a,x,y,z){addBlock(a,x,y,z,used);}
    A(trunk,bx,0,bz);A(trunk,bx,1,bz);A(trunk,bx+1,2,bz);A(trunk,bx+1,3,bz);A(trunk,bx+1,4,bz);
    for(let x=-4;x<=4;x++){for(let z=-4;z<=4;z++){for(let y=3;y<=5;y++){A(leaves,bx+1+x,y,bz+z);}}}
    for(let x=-3;x<=3;x++){for(let z=-3;x<=3;z++){A(leaves,bx+1+x,2,bz+z);}} 
    
    leaves.length; 
  
    return{trunk,leaves};
  }
  
  function createFancyCherryTree6(base) {
    const trunk=[], leaves=[], used=new Set();
    const bx=base[0], bz=base[1];
    function A(a,x,y,z){addBlock(a,x,y,z,used);}
    A(trunk,bx,0,bz);A(trunk,bx,1,bz);A(trunk,bx+1,2,bz);A(trunk,bx+1,3,bz);A(trunk,bx+1,4,bz);
    for(let x=-4;x<=4;x++){for(let z=-4;z<=4;z++){for(let y=3;y<=5;y++){A(leaves,bx+1+x,y,bz+z);}}}
    for(let x=-3;x<=3;x++){for(let z=-3;z<=3;z++){A(leaves,bx+1+x,2,bz+z);}}
    return{trunk,leaves};
  }
  
  function drawCherryTree(gl, tree) {
    gl.useProgram(trunkProgram);
    for(let i=0;i<tree.trunk.length;i++){
      let m=mat4.create();
      mat4.translate(m,m,tree.trunk[i]);
      drawTexturedCube(gl,trunkProgram,m,logTexture);
    }
    for(let i=0;i<tree.leaves.length;i++){
      let m=mat4.create();
      mat4.translate(m,m,tree.leaves[i]);
      drawTexturedCube(gl,trunkProgram,m,leafTexture);
    }
  }
  