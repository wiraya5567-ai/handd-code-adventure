(function(){
  const L = (id,title,concept,objective,grid,start,goal,obstacles=[],markers=[]) => ({id,title,concept,objective,grid,start,goal,obstacles,markers});
  window.GAME_LEVELS = [
    L(1,'เส้นทางแรก','Sequence','พา Robot ไปหา ⭐ เป้าหมาย', {w:8,h:5}, {x:1,y:2,dir:0}, {x:6,y:2}, [{x:3,y:2}]),
    L(2,'เลี้ยวให้ถูกทาง','Sequence + Turning','เดินตรง แล้วเลี้ยวขวาเพื่อไปหา ⭐', {w:8,h:7}, {x:1,y:5,dir:0}, {x:5,y:1}, [{x:3,y:5},{x:3,y:4},{x:3,y:3}]),
    L(3,'หลบกำแพง','Obstacle','หลบกำแพง 1 จุด แล้วเดินต่อไปยัง ⭐', {w:9,h:7}, {x:1,y:3,dir:0}, {x:7,y:3}, [{x:4,y:3},{x:4,y:2}]),
    L(4,'ประตูสองสี','IF / THEN','เมื่อเจอ 🔴 ให้เลี้ยวซ้าย', {w:9,h:7}, {x:1,y:5,dir:0}, {x:7,y:1}, [{x:4,y:5},{x:4,y:4},{x:4,y:2}], [{x:4,y:3,color:'red'}]),
    L(5,'โรงงานทำซ้ำ','Loop','ลองใช้ REPEAT เพื่อเดินทางยาว ๆ', {w:10,h:5}, {x:1,y:2,dir:0}, {x:8,y:2}, [], []),
    L(6,'ทางยาว','Loop + Sequence','ใช้ REPEAT ช่วยเดินในทางตรงยาว', {w:12,h:5}, {x:1,y:2,dir:0}, {x:10,y:2}, [{x:6,y:1},{x:6,y:3}], []),
    L(7,'ประตูสองสี','IF / THEN','ถ้าเจอ 🔴 เลี้ยวซ้าย และถ้าเจอ 🔵 เลี้ยวขวา', {w:10,h:7}, {x:1,y:5,dir:0}, {x:8,y:1}, [{x:4,y:5},{x:4,y:4},{x:7,y:2}], [{x:4,y:3,color:'red'},{x:7,y:3,color:'blue'}]),
    L(8,'นักสืบ Algorithm','Debug','แก้ Algorithm ที่ผิด แล้วพา Robot ไปหา ⭐', {w:9,h:7}, {x:1,y:5,dir:0}, {x:7,y:1}, [{x:4,y:5},{x:4,y:4},{x:4,y:2}], []),
    L(9,'ภารกิจสร้างเส้นทาง','Sequence + Loop','สร้าง Algorithm ของตัวเองให้ถึง ⭐', {w:11,h:7}, {x:1,y:5,dir:0}, {x:9,y:1}, [{x:5,y:5},{x:5,y:4},{x:8,y:2}], [{x:5,y:3,color:'blue'}]),
    L(10,'ปรมาจารย์มือ','Sequence + Loop + IF + Debug','ใช้คำสั่งที่เรียนมาให้ Robot ถึง ⭐', {w:12,h:8}, {x:1,y:6,dir:0}, {x:10,y:1}, [{x:4,y:6},{x:4,y:5},{x:4,y:4},{x:8,y:3},{x:8,y:2}], [{x:4,y:3,color:'red'},{x:8,y:4,color:'blue'}])
  ];
})();
