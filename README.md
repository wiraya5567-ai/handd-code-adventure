# HAND CODE ADVENTURE — Unlimited Commands Edition

เกมการเรียนรู้ HTML5 สำหรับสอน Computational Thinking ผ่านการสร้าง Algorithm และควบคุม Robot ด้วยท่าทางมือ

## จุดเด่นของเวอร์ชันนี้
- **คำสั่งไม่จำกัดทุกด่าน** ไม่มี `maxCommands`
- ถ้า RUN แล้ว **ถึง Goal = +100 คะแนน**
- ถ้า RUN แล้ว **ยังไม่ถึง Goal / ชนกำแพง / ออกนอกพื้นที่ = -20 คะแนน** แล้วกลับไปแก้ Algorithm ได้ทันที
- Hint = -5 คะแนน
- คะแนนไม่ต่ำกว่า 0
- 10 ด่าน ออกแบบใหม่ให้โจทย์สั้นและเข้าใจง่ายขึ้น
- Gesture: MOVE / RIGHT / LEFT / STOP / RUN
- Loop: REPEAT ×2 / ×3
- Condition: IF RED → LEFT / IF BLUE → RIGHT
- Debug feedback ภาษาไทย
- Mouse / Touch / Keyboard fallback
- Camera diagnostics และ retry flow
- LocalStorage สำหรับ progress
- Teacher Mode เบื้องต้น
- F9 Developer Test Mode

## ไฟล์
- `index.html`
- `style.css`
- `app.js`
- `levels.js`
- `README.md`

## วิธีรันด้วย VS Code + Live Server
1. เปิดโฟลเดอร์นี้ใน VS Code
2. ติดตั้งส่วนเสริม Live Server
3. คลิกขวา `index.html` → **Open with Live Server**
4. เปิดด้วย Chrome/Edge
5. อนุญาต Camera หากต้องการใช้ Hand Detection

## วิธีรันด้วย Python
เปิด Terminal ในโฟลเดอร์โปรเจกต์แล้วใช้:

```bash
python -m http.server 8000
```

จากนั้นเปิด:

`http://localhost:8000`

## กล้อง
- Camera ต้องใช้ผ่าน HTTPS หรือ localhost
- ระบบตรวจ `getUserMedia()` → `srcObject` → `loadedmetadata` → `play()` → ตรวจ `videoWidth/videoHeight` ก่อนเริ่ม Hand Detection
- ปุ่มเปิด/ปิด/ลองใหม่มีให้ในหน้า Setup
- ถ้า Camera ใช้งานไม่ได้ เกมยังเล่นผ่าน Mouse/Touch/Keyboard ได้
- ไม่บันทึกหรืออัปโหลดภาพ/วิดีโอจากกล้อง

## Gesture
- ☝️ MOVE
- ✌️ RIGHT
- 🤟 LEFT
- ✊ STOP
- 👍 RUN

Gesture ต้องคงอยู่ประมาณ 650ms และมี cooldown ประมาณ 1100ms ก่อนรับคำสั่งซ้ำ

## Keyboard
- Arrow Up / W = MOVE
- Arrow Right / D = RIGHT
- Arrow Left / A = LEFT
- Space = STOP
- Enter = RUN
- F9 = Developer Test Mode

## Deploy GitHub Pages
1. สร้าง Repository
2. อัปโหลดไฟล์ทั้งหมด
3. Settings → Pages
4. เลือก Deploy from branch
5. เลือก `main` / root

## หมายเหตุเรื่อง Hand Detection
เวอร์ชันนี้ pin MediaPipe Hands ที่ `@mediapipe/hands@0.4.1675469240` ผ่าน jsDelivr เพื่อให้การโหลดไม่ลอยไปเวอร์ชันใหม่โดยอัตโนมัติ หาก CDN โหลดไม่ได้ เกมจะยังใช้งานได้ด้วย fallback controls

## Privacy
ระบบประมวลผลกล้องใน Browser/อุปกรณ์เป็นหลัก และไม่ upload/save/record webcam stream
