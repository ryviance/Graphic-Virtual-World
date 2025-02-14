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
    // Set a temporary 1x1 blue pixel for each face
    faceInfos.forEach(function(faceInfo) {
      gl.texImage2D(faceInfo.target, 0, gl.RGBA, 1, 1, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));
    });
    // Load the image and assign it to all faces
    const image = new Image();
    image.src = url;
    image.onload = function() {
      faceInfos.forEach(function(faceInfo) {
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
        gl.texImage2D(faceInfo.target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      });
      // Use linear filtering (no mipmaps for NPOT textures)
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    };
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }
  