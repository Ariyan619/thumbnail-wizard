// Core state
let bgImage = null;
let elements = []; // [{type, ...}, ...] (type: 'img'/'text')
let selectedIdx = null;
let history = [], future = [];
let showGrid = false;
let canvasSize = {width:1280, height:720};
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function saveHistory() {
  history.push(JSON.stringify(elements));
  if (history.length > 40) history.shift();
  // Clear redo stack
  future = [];
}
function undo() {
  if (history.length === 0) return;
  future.push(JSON.stringify(elements));
  elements = JSON.parse(history.pop());
  selectedIdx = null;
  drawCanvas();
}
function redo() {
  if (future.length === 0) return;
  history.push(JSON.stringify(elements));
  elements = JSON.parse(future.pop());
  selectedIdx = null;
  drawCanvas();
}
function selectElement(idx) {
  selectedIdx = idx;
  updateStyler();
  drawCanvas();
}
function addTextElement(txt="Text Here") {
  const e = {
    type:"text", text:txt, x:canvas.width/2, y:canvas.height/2,
    font:"Roboto", size:64, color:"#fff", align:"center",
    stroke:false, shadow:false, rotate:0, borderRadius:0, width:300, height:80,
    bg:null, layer:elements.length
  };
  elements.push(e); saveHistory(); drawCanvas();
}
function addImageElement(img, src) {
  const e = {
    type:"img", img, src, x:canvas.width/2-100, y:canvas.height/2-70,
    width:img.width>200?200:img.width, height:img.height>140?140:img.height,
    layer:elements.length, borderRadius:0
  };
  elements.push(e); saveHistory(); drawCanvas();
}
function deleteElement(idx) {
  elements.splice(idx,1); saveHistory();
  selectedIdx = null; drawCanvas();
}
function moveElement(dx,dy) {
  if (selectedIdx==null) return;
  let e = elements[selectedIdx];
  e.x += dx; e.y += dy; drawCanvas();
}
function bringFwd() {
  if (selectedIdx == null) return;
  let ei = elements[selectedIdx];
  let maxL = Math.max(...elements.map(e=>e.layer));
  if (ei.layer == maxL) return;
  ei.layer++;
  elements.sort((a,b)=>a.layer-b.layer);
  drawCanvas();
}
function sendBack() {
  if (selectedIdx == null) return;
  let ei = elements[selectedIdx];
  let minL = Math.min(...elements.map(e=>e.layer));
  if (ei.layer == minL) return;
  ei.layer--;
  elements.sort((a,b)=>a.layer-b.layer);
  drawCanvas();
}
function drawGridLines() {
  ctx.save();
  ctx.strokeStyle="#fff4";
  ctx.setLineDash([8,4]);
  // Vertical
  ctx.beginPath();
  ctx.moveTo(canvas.width/2,0); ctx.lineTo(canvas.width/2,canvas.height);
  ctx.stroke();
  // Horizontal
  ctx.beginPath();
  ctx.moveTo(0,canvas.height/2); ctx.lineTo(canvas.width,canvas.height/2);
  ctx.stroke();
  ctx.restore();
}
function drawCanvas() {
  // bg color
  ctx.fillStyle=document.getElementById('bgColor').value;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // background image
  if(bgImage) ctx.drawImage(bgImage,0,0,canvas.width,canvas.height);  

  // grid if enabled
  if(showGrid) drawGridLines();

  // sort elements by layer
  elements.sort((a,b)=>a.layer-b.layer);

  // draw each element
  elements.forEach((el,i)=>{
    ctx.save();
    // Move center (for rotation)
    ctx.translate(el.x, el.y);
    ctx.rotate((el.rotate||0)*Math.PI/180);
    // Border radius?
    if((el.borderRadius||0)>0 && el.type!=="text") {
      roundedImageDraw(el, i);
      ctx.restore();
      return;
    }
    if(el.type==="img") {
      ctx.drawImage(el.img,-el.width/2,-el.height/2,el.width,el.height);
    } else {
      // background for text?
      if(el.bg) {
        ctx.fillStyle=el.bg;
        ctx.fillRect(-el.width/2,-el.height/2,el.width,el.height);
      }
      ctx.font = `bold ${el.size}px '${el.font}'`;
      ctx.textAlign = el.align;
      ctx.textBaseline = "middle";
      // Shadow
      ctx.shadowColor = el.shadow ? "#000c" : "transparent";
      ctx.shadowOffsetX = el.shadow ? 3 : 0;
      ctx.shadowOffsetY = el.shadow ? 3 : 0;
      ctx.shadowBlur = el.shadow ? 6 : 0;
      // Stroke
      if(el.stroke) {
        ctx.lineWidth = 5;
        ctx.strokeStyle="#000";
        ctx.strokeText(el.text,0,0);
      }
      ctx.fillStyle=el.color;
      ctx.fillText(el.text,0,0);
    }
    // Draw selected outline
    if(i===selectedIdx) drawOutline(el);
    ctx.restore();
  });

  // Live coords/dims
  if(selectedIdx!=null) {
    const e = elements[selectedIdx];
    document.getElementById("coords").textContent = `X:${(e.x|0)} Y:${(e.y|0)} | W:${(e.width|0)} H:${(e.height|0)}${e.type==="text"?" | rot:"+e.rotate:""}`;
  } else {
    document.getElementById("coords").textContent="";
  }
}
function drawOutline(e) {
  ctx.save();
  ctx.strokeStyle = "#fdb92b";
  ctx.lineWidth = 2;
  ctx.setLineDash([8,5]);
  if(e.type==="img" || e.type==="text") {
    ctx.beginPath();
    ctx.rect(-e.width/2,-e.height/2, e.width,e.height);
    ctx.stroke();
  }
  ctx.restore();
}
function roundedImageDraw(el, idx) {
  ctx.save();
  let r = el.borderRadius;
  ctx.beginPath();
  ctx.moveTo(-el.width/2+r,-el.height/2);
  ctx.lineTo(el.width/2-r,-el.height/2);
  ctx.quadraticCurveTo(el.width/2,-el.height/2,el.width/2,-el.height/2+r);
  ctx.lineTo(el.width/2,el.height/2-r);
  ctx.quadraticCurveTo(el.width/2,el.height/2,el.width/2-r,el.height/2);
  ctx.lineTo(-el.width/2+r,el.height/2);
  ctx.quadraticCurveTo(-el.width/2,el.height/2,-el.width/2,el.height/2-r);
  ctx.lineTo(-el.width/2,-el.height/2+r);
  ctx.quadraticCurveTo(-el.width/2,-el.height/2,-el.width/2+r,-el.height/2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(el.img,-el.width/2,-el.height/2,el.width,el.height);
  ctx.restore();
  if(idx === selectedIdx) drawOutline(el);
}

// ========== Interactivity ================

// --- Mouse events for drag/resize ---
let dragOffset = {x:0,y:0}, isDragging = false, resizingEdge=null;
canvas.addEventListener('mousedown',e=>{
  const mx = e.offsetX, my=e.offsetY;
  for(let i=elements.length-1; i>=0; i--) { // Top-most first
    let obj = elements[i];
    let {x, y, width, height, rotate=0} = obj;
    // Undo rotation for pointer math
    let dx = mx-x, dy = my-y;
    let xp = Math.cos(-rotate*Math.PI/180)*dx - Math.sin(-rotate*Math.PI/180)*dy;
    let yp = Math.sin(-rotate*Math.PI/180)*dx + Math.cos(-rotate*Math.PI/180)*dy;
    if(xp>-width/2 && xp<width/2 && yp>-height/2 && yp<height/2) {
      selectElement(i); // Select
      dragOffset = {x:xp, y:yp};
      isDragging = true;
      return;
    }
  }
  // Clicked empty area
  selectedIdx = null; updateStyler(); drawCanvas();
});
canvas.addEventListener('mousemove',e=>{
  if(isDragging && selectedIdx!=null) {
    const el=elements[selectedIdx];
    el.x = e.offsetX-dragOffset.x;
    el.y = e.offsetY-dragOffset.y;
    // Snap-to-center
    if(Math.abs(el.x-canvas.width/2)<10) el.x=canvas.width/2;
    if(Math.abs(el.y-canvas.height/2)<10) el.y=canvas.height/2;
    drawCanvas();
  }
});
canvas.addEventListener('mouseup', ()=>{ isDragging = false;});

// --- Keyboard controls (arrow, delete) ---
document.addEventListener('keydown', function(e) {
  if(selectedIdx==null) return;
  let el = elements[selectedIdx];
  switch(e.key) {
    case "Delete": deleteElement(selectedIdx); break;
    case "ArrowUp":    el.y-=5; drawCanvas(); break;
    case "ArrowDown":  el.y+=5; drawCanvas(); break;
    case "ArrowLeft":  el.x-=5; drawCanvas(); break;
    case "ArrowRight": el.x+=5; drawCanvas(); break;
    case "Tab": // forward select
      e.preventDefault();
      selectElement((selectedIdx+1)%elements.length);
      break;
  }
});
canvas.addEventListener('dblclick',()=>{
  if(selectedIdx!=null && elements[selectedIdx].type==="text") {
    let txt = prompt("Edit text:", elements[selectedIdx].text);
    if(txt!==null) { elements[selectedIdx].text=txt; drawCanvas();}
  }
});

// ==== Toolbar/Styler Events ====
document.getElementById("addTextBtn").onclick = ()=>addTextElement();
document.getElementById("addImageBtn").onclick = ()=>document.getElementById("addImageInput").click();
document.getElementById("addImageInput").onchange = function(e){
  const file = e.target.files[0];
  if(!file) return;
  const img = new window.Image();
  img.onload = () => { addImageElement(img, URL.createObjectURL(file)); };
  img.src = URL.createObjectURL(file);
  e.target.value=""; // reset
};
document.getElementById("bgUpload").onchange = function(e){
  const file = e.target.files[0];
  if(!file) return;
  bgImage = new window.Image();
  bgImage.onload = drawCanvas;
  bgImage.src = URL.createObjectURL(file);
};
document.getElementById("undoBtn").onclick = undo;
document.getElementById("redoBtn").onclick = redo;
document.getElementById("downloadBtn").onclick = ()=>{
  const a = document.createElement('a');
  a.download = 'thumbnail.png';
  canvas.toBlob(blob=>{
    a.href = URL.createObjectURL(blob); a.click();
  });
};
document.getElementById("saveBtn").onclick = ()=>{
  localStorage.setItem("thumbwiz_save", JSON.stringify({elements, bg: (bgImage?bgImage.src:null), canvasSize}));
  alert("Project saved!");
};
document.getElementById("loadBtn").onclick = ()=>{
  let obj = JSON.parse(localStorage.getItem("thumbwiz_save")||"null");
  if(!obj) return alert("No save!");
  elements = obj.elements; canvasSize = obj.canvasSize;
  if(obj.bg) {
    bgImage = new window.Image();
    bgImage.onload=drawCanvas;
    bgImage.src = obj.bg;
  }
  drawCanvas();
};

// Font/Size/color
function updateStyler() {
  let styler = document.getElementById("styler");
  if (selectedIdx == null || elements[selectedIdx].type === "img") {
    styler.style.opacity = 0.3;
    return;
  }
  styler.style.opacity = 1.0;
  const el = elements[selectedIdx];
  // Populate UI fields
  document.getElementById("fontPicker").value = el.font;
  document.getElementById("fontSize").value = el.size;
  document.getElementById("fontColor").value = el.color;
  document.getElementById("fontStroke").checked = el.stroke;
  document.getElementById("fontShadow").checked = el.shadow;
  document.getElementById("fontRotate").value = el.rotate;
  document.getElementById("borderRadius").value = el.borderRadius || 0;
}
["fontPicker","fontSize","fontColor","fontStroke","fontShadow","fontRotate","borderRadius"]
.forEach(id=>{
  document.getElementById(id).oninput = ()=>{
    if(selectedIdx==null || elements[selectedIdx].type==="img") return;
    let el = elements[selectedIdx];
    if(id==="fontPicker") el.font=document.getElementById(id).value;
    else if(id==="fontSize") el.size=+document.getElementById(id).value;
    else if(id==="fontColor") el.color=document.getElementById(id).value;
    else if(id==="fontStroke") el.stroke=document.getElementById(id).checked;
    else if(id==="fontShadow") el.shadow=document.getElementById(id).checked;
    else if(id==="fontRotate") el.rotate=+document.getElementById(id).value;
    else if(id==="borderRadius") el.borderRadius=+document.getElementById(id).value;
    drawCanvas();
  };
});
document.getElementById("bringFwdBtn").onclick = bringFwd;
document.getElementById("sendBackBtn").onclick = sendBack;

// Size select
document.getElementById("canvasSize").onchange = function(e){
  let val = e.target.value;
  if(val==="custom") {
    document.getElementById("customWidth").style.display="inline";
    document.getElementById("customHeight").style.display="inline";
  } else {
    let [w,h] = val.split('x');
    [canvas.width,canvas.height]=[+w,+h];
    canvasSize={width:+w, height:+h};
    document.getElementById("customWidth").style.display="none";
    document.getElementById("customHeight").style.display="none";
    drawCanvas();
  }
};
document.getElementById("customWidth").onchange = function(e){
  canvas.width = +e.target.value;
  canvasSize.width = +e.target.value;
  drawCanvas();
}
document.getElementById("customHeight").onchange = function(e){
  canvas.height = +e.target.value;
  canvasSize.height = +e.target.value;
  drawCanvas();
}

// Grid toggle
document.getElementById("toggleGridBtn").onclick = ()=>{
  showGrid = !showGrid;
  document.getElementById("toggleGridBtn").textContent = showGrid?"Hide Grid":"Show Grid";
  drawCanvas();
}

// Templates
const templates = [
  {name:"Gaming", els: [
    {type:"text", text:"Epic Gameplay!", x:640, y:640, font:"Bangers", size:130, color:"#fff", align:"center", stroke:true, shadow:true, rotate:0, width:900, height:160, layer:1, borderRadius:0},
    {type:"text", text:"Subscribe ➡️", x:160, y:120, font:"Oswald", size:64, color:"#fdb92b", align:"left", stroke:true, shadow:true, rotate:-12, width:400, height:80, layer:2, borderRadius:14}
  ]},
  {name:"Vlog", els: [
    {type:"text", text:"A Day in My Life", x:640, y:220, font:"Merriweather", size:93, color:"#fff", align:"center", stroke:true, shadow:true, rotate:0, width:640, height:110, layer:1, borderRadius:7},
    {type:"text", text:"New Video", x:1050, y:680, font:"Roboto", size:56, color:"#fdb92b", align:"right", stroke:true, shadow:false, rotate:6, width:400, height:64, layer:2, borderRadius:12}
  ]},
  {name:"Education", els: [
    {type:"text", text:"Learn Coding!", x:890, y:224, font:"Oswald", size:89, color:"#3afe42", align:"right", stroke:true, shadow:true, rotate:0, width:740, height:96, layer:1, borderRadius:0 }
  ]}
];
document.getElementById("templateBtn").onclick = ()=>{
  let m = document.getElementById("templateModal");
  m.innerHTML = "<h3>Choose a Template:</h3><ul style='list-style:none;padding-left:0'>";
  templates.forEach((tpl,i)=>{
    m.innerHTML += `<li><button onclick="chooseTpl(${i})">${tpl.name}</button></li>`;
  });
  m.innerHTML += "<button onclick='closeModal()'>Cancel</button>";
  m.classList.remove("hidden");
}
window.chooseTpl = function(i) {
  elements = JSON.parse(JSON.stringify(templates[i].els));
  document.getElementById("templateModal").classList.add("hidden");
  drawCanvas();
};
window.closeModal = function(){document.getElementById("templateModal").classList.add("hidden");}

drawCanvas();

