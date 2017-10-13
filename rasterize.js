



/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog2/triangles.json"; // triangles file loc
const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog2/ellipsoids.json"; // ellipsoids file loc
var Eye = new vec4.fromValues(0.5,0.5,-0.5,1.0); // default eye position in world space

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var vertexBuffer; // this contains vertex coordinates in triples
var triangleBuffer; // this contains indices into vertexBuffer in triples
var triBufferSize = 0; // the number of indices in the triangle buffer
var vertexPositionAttrib; // where to put position for vertex shader


// Global Vectors
const DIMENSIONS  = 3; 

var ellipsoidVertexBuffer = [];
var ellipsoidTriangleBuffer = [];
var ellipsoidNormalBuffer = [];
var ellipsoidAmbientBuffer = [];
var ellipsoidDiffuseBuffer = [];
var ellipsoidSpecularBuffer = [];
var upVector = new vec3.fromValues(0,1,0);
var lookAtVector = new vec3.fromValues(0,0,1);
var lightPosn = new vec3.fromValues(-1,3,-0.5);
var lightColor = new vec3.fromValues(1, 1, 1);
var Shadow = false;
var MultipleLights = false;

var ellipseXF = [];
var mvEllipse = [];
var triangleXF = [];
var mvTriangle = [];
var ellipseLoad = false;
var triangleLoad = false;
// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
function getJSONFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return JSON.parse(httpReq.response); 
        } // end if good params
    } // end try    
    
    catch(e) {
        console.log(e);
        return(String.null);
    }
} // end get json file

// set up the webGL environment
function setupWebGL() {

    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it
    
    try {
      if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
      } else {
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
      }
    } // end try
    
    catch(e) {
      console.log(e);
    } // end catch
 
} // end setupWebGL

function loadEllipsoids() {

    if(!ellipseLoad) {
        inputEllipsoids = getJSONFile(INPUT_SPHERES_URL, "ellipsoids");
       for(var index = 0; index < inputEllipsoids.length; index++) {
            ellipseXF[index] = mat4.create();
            mvEllipse[index] = mat4.create();
       }
   }

   if(inputEllipsoids != String.null) {
    ellipseLoad = true;
       for(var index = 0; index < inputEllipsoids.length; index++) {
           setEllipseBuffers(index, selectedIndex);
       }
   }    
}

function setEllipseBuffers(index, selectedIndex){
    var vertexPosn = [];
    var indexValues = [];
    var ambientColors = [];
    var diffuseColors = [];
    var specularColors = [];
    var normals = [];
    var aColor, dColor, sColor;
    var latitudeBands = 30;
    var longitudeBands = 30;
    var radiusA, radiusB, radiusC, posX, posY, posZ;


    aColor = inputEllipsoids[index].ambient;
    dColor = inputEllipsoids[index].diffuse;
    sColor = inputEllipsoids[index].specular;

    radiusA = inputEllipsoids[index].a;
    radiusB = inputEllipsoids[index].b;
    radiusC = inputEllipsoids[index].c;
    posX = inputEllipsoids[index].x;
    posY = inputEllipsoids[index].y;
    posZ = inputEllipsoids[index].z;
    
        
    for(var latNumber=0; latNumber <= latitudeBands; latNumber++) {
        var theta = latNumber * Math.PI / latitudeBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for(var longNumber=0; longNumber <= longitudeBands; longNumber++) {
            var phi = longNumber * 2 * Math.PI / longitudeBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;

            normals.push(x);
            normals.push(y);
            normals.push(z);

            vertexPosn.push((radiusA * x) + posX);
            vertexPosn.push((radiusB * y) + posY);
            vertexPosn.push((radiusC * z) + posZ);

            ambientColors.push(aColor[0], aColor[1], aColor[2], 1.0);
            diffuseColors.push(dColor[0], dColor[1], dColor[2], 1.0);
            specularColors.push(sColor[0], sColor[1], sColor[2], inputEllipsoids[index].n);
        }
    }

    for(var latNumber = 0; latNumber < latitudeBands; latNumber++) {
        for(var longNumber = 0; longNumber < longitudeBands; longNumber++) {
            var first = (latNumber * (longitudeBands + 1)) + longNumber;
            var second = first + longitudeBands + 1;
            indexValues.push(first);
            indexValues.push(second);
            indexValues.push(first + 1);

            indexValues.push(second);
            indexValues.push(second + 1);
            indexValues.push(first + 1);
        }
    }

    // send the vertex coords to webGL
    ellipsoidVertexBuffer[index] = gl.createBuffer(); // init empty vertex coord buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, ellipsoidVertexBuffer[index]); // activate that buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPosn), gl.STATIC_DRAW); // coords to that buffer
    ellipsoidVertexBuffer[index].itemSize = 3;
    ellipsoidVertexBuffer[index].numItems = vertexPosn.length / 3;

    ellipsoidNormalBuffer[index] = gl.createBuffer(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, ellipsoidNormalBuffer[index]); 
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW); 
    ellipsoidNormalBuffer[index].itemSize = 3;
    ellipsoidNormalBuffer[index].numItems = normals.length / 3;
    
    // send the triangle indices to webGL
    ellipsoidTriangleBuffer[index] = gl.createBuffer(); // init empty triangle index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ellipsoidTriangleBuffer[index]); // activate that buffer
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexValues), gl.STATIC_DRAW); // indices to that buffer
    ellipsoidTriangleBuffer[index].itemSize = 1;
    ellipsoidTriangleBuffer[index].numItems = indexValues.length;

    ellipsoidAmbientBuffer[index] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ellipsoidAmbientBuffer[index]);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ambientColors), gl.STATIC_DRAW);
    ellipsoidAmbientBuffer[index].itemSize = 4;
    ellipsoidAmbientBuffer[index].numItems = ambientColors.length / 4;

    ellipsoidDiffuseBuffer[index] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ellipsoidDiffuseBuffer[index]);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(diffuseColors), gl.STATIC_DRAW);
    ellipsoidDiffuseBuffer[index].itemSize = 4;
    ellipsoidDiffuseBuffer[index].numItems = diffuseColors.length / 4;

    ellipsoidSpecularBuffer[index] = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ellipsoidSpecularBuffer[index]);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(specularColors), gl.STATIC_DRAW);
    ellipsoidSpecularBuffer[index].itemSize = 4;
    ellipsoidSpecularBuffer[index].numItems = specularColors.length / 4;
}

// read triangles in, load them into webgl buffers
function loadTriangles() {
    var inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles");

    if (inputTriangles != String.null) { 
        var whichSetVert; // index of vertex in current triangle set
        var whichSetTri; // index of triangle in current triangle set
        var coordArray = []; // 1D array of vertex coords for WebGL
        var indexArray = []; // 1D array of vertex indices for WebGL
        var vtxBufferSize = 0; // the number of vertices in the vertex buffer
        var vtxToAdd = []; // vtx coords to add to the coord array
        var indexOffset = vec3.create(); // the index offset for the current set
        var triToAdd = vec3.create(); // tri indices to add to the index array
        
        for (var whichSet=0; whichSet<inputTriangles.length; whichSet++) {
            vec3.set(indexOffset,vtxBufferSize,vtxBufferSize,vtxBufferSize); // update vertex offset
            
            // set up the vertex coord array
            for (whichSetVert=0; whichSetVert<inputTriangles[whichSet].vertices.length; whichSetVert++) {
                vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert];
                coordArray.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]);
            } // end for vertices in set
            
            // set up the triangle index array, adjusting indices across sets
            for (whichSetTri=0; whichSetTri<inputTriangles[whichSet].triangles.length; whichSetTri++) {
                vec3.add(triToAdd,indexOffset,inputTriangles[whichSet].triangles[whichSetTri]);
                indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]);
            } // end for triangles in set

            vtxBufferSize += inputTriangles[whichSet].vertices.length; // total number of vertices
            triBufferSize += inputTriangles[whichSet].triangles.length; // total number of tris
        } // end for each triangle set 
        triBufferSize *= 3; // now total number of indices

        // console.log("coordinates: "+coordArray.toString());
        // console.log("numverts: "+vtxBufferSize);
        // console.log("indices: "+indexArray.toString());
        // console.log("numindices: "+triBufferSize);
        
        // send the vertex coords to webGL
        vertexBuffer = gl.createBuffer(); // init empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(coordArray),gl.STATIC_DRAW); // coords to that buffer
        
        // send the triangle indices to webGL
        triangleBuffer = gl.createBuffer(); // init empty triangle index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer); // activate that buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indexArray),gl.STATIC_DRAW); // indices to that buffer

    } // end if triangles found
} // end load triangles

// setup the webGL shaders
function setupShaders() {
    
    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
        void main(void) {
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // all fragments are white
        }
    `;
    
    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        attribute vec3 vertexPosition;

        void main(void) {
            gl_Position = vec4(vertexPosition, 1.0); // use the untransformed position
        }
    `;
    
    try {
        // console.log("fragment shader: "+fShaderCode);
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        // console.log("vertex shader: "+vShaderCode);
        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution
            
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);  
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);  
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)
                vertexPositionAttrib = // get pointer to vertex shader input
                    gl.getAttribLocation(shaderProgram, "vertexPosition"); 
                gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders

function renderEllipsoids() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
    
    var ellipsoidVertexBuffer = [];
    var ellipsoidTriangleBuffer = [];
    var ellipsoidNormalBuffer = [];
    var ellipsoidAmbientBuffer = [];
    var ellipsoidDiffuseBuffer = [];
    var ellipsoidSpecularBuffer = [];
    // vertex buffer: activate and feed into vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER,ellipsoidVertexBuffer); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,ellipsoidVertexBuffer.itemSize,gl.FLOAT,false,0,0); // feed

    gl.bindBuffer(gl.ARRAY_BUFFER,ellipsoidNormalBuffer); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,ellipsoidNormalBuffer.itemSize,gl.FLOAT,false,0,0); // feed
    gl.bindBuffer(gl.ARRAY_BUFFER,ellipsoidAmbientBuffer); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,ellipsoidAmbientBuffer.itemSize,gl.FLOAT,false,0,0); // feed
    gl.bindBuffer(gl.ARRAY_BUFFER,ellipsoidDiffuseBuffer); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,ellipsoidDiffuseBuffer.itemSize,gl.FLOAT,false,0,0); // feed
    gl.bindBuffer(gl.ARRAY_BUFFER,ellipsoidSpecularBuffer); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,ellipsoidSpecularBuffer,gl.FLOAT,false,0,0); // feed

    // triangle buffer: activate and render
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffer); // activate
    gl.drawElements(gl.TRIANGLES,triBufferSize,gl.UNSIGNED_SHORT,0); // render
}
// render the loaded model
function renderTriangles() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
    
    // vertex buffer: activate and feed into vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed

    // triangle buffer: activate and render
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffer); // activate
    gl.drawElements(gl.TRIANGLES,triBufferSize,gl.UNSIGNED_SHORT,0); // render
} // end render triangles


/* MAIN -- HERE is where execution begins after window load */

function main() {
  
  setupWebGL(); // set up the webGL environment
  loadTriangles(); // load in the triangles from tri file
  setupShaders(); // setup the webGL shaders
  renderTriangles(); // draw the triangles using webGL
  
} // end main
